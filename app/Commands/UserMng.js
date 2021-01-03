'use strict'

/**
 * Using PHP Yii2 usario https://yii2-usuario.readthedocs.io/en/latest/installation/console-commands/
 * to add / confirm users in batch mode
 * To skip welcome email, go to vendor/usuario/src/service/user/UserCreateService
 * and comment out the email part
 */

const {Command} = require('@adonisjs/ace')
const fs = require('fs')
const _ = require('lodash')
const Db = use('Database')
const Profile = use('App/Models/Profile')
const {exec, execSync} = require('child_process');

const CR_USER_CMD = `./yii user/create ` // ./yii user/create <email> <username> [password] [role]

const CONF_USER_CMD = `./yii user/confirm `
const DEL_USER_CMD = `yes | ./yii user/delete `

const USERS = ['James Smith', 'Michael Smith', 'Robert Smith', 'David Smith', 'James Johnson', 'Michael Johnson', 'William Smith', 'James Williams', 'Robert Johnson', 'Mary Smith', 'James Brown', 'John Smith', 'David Johnson', 'Michael Brown', 'Maria Garcia', 'Michael Williams', 'Michael Jones', 'James Jones', 'Maria Rodriguez', 'Robert Brown', 'Michael Miller', 'Robert Jones', 'Robert Williams', 'William Johnson', 'James Davis', 'Mary Johnson', 'Maria Martinez', 'Charles Smith', 'David Brown', 'Robert Miller', 'James Miller', 'John Williams', 'Richard Smith', 'David Williams', 'David Jones', 'Michael Davis', 'William Brown', 'David Miller', 'Mary Williams', 'Jennifer Smith', 'William Jones', 'John Johnson', 'John Miller', 'Daniel Smith', 'Thomas Smith', 'Linda Smith', 'James Wilson', 'Robert Davis', 'Mary Brown', 'Mary Jones', 'Patricia Smith', 'James Moore', 'James Taylor', 'William Miller', 'John Davis', 'Charles Johnson', 'William Davis', 'John Jones', 'Richard Johnson', 'James Anderson', 'Robert Taylor', 'Barbara Smith', 'Michael Moore', 'James Martin', 'Michael Wilson', 'James Thomas', 'Joseph Smith', 'James White', 'Mary Miller', 'Robert Anderson', 'Robert Wilson', 'Charles Williams', 'Jennifer Johnson', 'Michael Anderson', 'John Brown', 'Michael Martin', 'James Thompson', 'Mark Smith', 'Michael Thomas', 'David Anderson', 'Linda Johnson', 'Elizabeth Smith', 'Mary Davis', 'James Jackson', 'Michael Taylor', 'Charles Brown', 'Daniel Garcia', 'James Lee', 'Michael Thompson', 'Daniel Johnson', 'David Wilson', 'Thomas Johnson', 'John Anderson', 'Robert Moore', 'John Wilson', 'Richard Brown', 'Charles Jones', 'Mark Johnson', 'Robert Lee', 'Patricia Johnson', 'Michael Lee', 'David Garcia', 'Robert Martin', 'Jennifer Jones', 'Daniel Martinez', 'John Thomas', 'John Martin', 'Richard Miller', 'Michael White', 'Robert Thomas', 'Barbara Johnson', 'Susan Smith', 'Robert Thompson', 'Daniel Rodriguez', 'Robert White', 'William Wilson', 'David Lee', 'Richard Jones', 'John Taylor', 'John Moore', 'Thomas Brown', 'Richard Williams', 'William Taylor', 'David Martin', 'David Martinez', 'William Moore', 'David Rodriguez', 'Thomas Williams', 'Linda Williams', 'David Moore', 'Daniel Miller', 'William Martin', 'Joseph Johnson', 'David White', 'Michael Jackson', 'Charles Davis', 'William White', 'Patricia Williams', 'Thomas Jones', 'David Thomas', 'William Thomas', 'Jennifer Brown', 'John Thompson', 'Charles Miller', 'Robert Jackson', 'David Thompson', 'Elizabeth Johnson', 'Mary Wilson', 'David Taylor', 'John Lee', 'Jennifer Williams', 'John White', 'Michael Garcia', 'Linda Jones', 'Joseph Williams', 'Linda Brown', 'William Thompson', 'Thomas Miller', 'Mary Anderson', 'Patricia Brown', 'Richard Davis', 'Daniel Brown', 'William Anderson', 'Jennifer Miller', 'Mary Thomas', 'Mary Moore', 'Patricia Jones', 'Mary Martin', 'Barbara Williams', 'Daniel Williams', 'Joseph Brown', 'Mary Taylor', 'Michael Martinez', 'Barbara Brown', 'William Jackson', 'Mark Miller', 'Linda Miller', 'Joseph Miller', 'Mary White', 'David Davis', 'Daniel Jones', 'David Jackson', 'Mary Thompson', 'Mark Williams', 'Susan Johnson', 'Barbara Jones', 'Mary Jackson', 'Jennifer Davis', 'Patricia Miller', 'Linda Davis', 'Thomas Davis', 'Richard Anderson', 'Elizabeth Garcia', 'Charles Wilson', 'Elizabeth Rodriguez', 'Robert Garcia', 'John Jackson', 'William Williams', 'Michael Rodriguez', 'Barbara Miller', 'Elizabeth Williams', 'Elizabeth Brown', 'William Lee', 'Mary Garcia', 'Elizabeth Martinez', 'Robert Martinez', 'Elizabeth Jones', 'Patricia Davis', 'Joseph Jones', 'Thomas Moore', 'Daniel Taylor', 'Charles Moore', 'Elizabeth Miller', 'Charles Taylor', 'Mary Martinez', 'Daniel Davis', 'Barbara Davis', 'Susan Miller', 'Joseph Davis', 'Mark Brown', 'Charles Thomas', 'Richard Wilson', 'Thomas Wilson', 'Robert Rodriguez', 'Mark Davis', 'Mary Lee', 'Mark Jones', 'Charles Anderson', 'Richard Taylor', 'Richard Martin', 'Thomas Martin', 'Richard Moore', 'Charles White', 'Mark Anderson', 'Susan Brown', 'John Garcia', 'Jennifer Wilson', 'Richard White', 'Jennifer Anderson', 'Thomas Anderson', 'John Martinez', 'Patricia Garcia', 'Daniel Martin', 'Charles Jackson', 'Jennifer Lee', 'Richard Thomas', 'Charles Thompson', 'Richard Thompson', 'Charles Martin', 'Elizabeth Davis', 'Thomas Taylor', 'Linda Wilson', 'Richard Garcia', 'Joseph Martin', 'Joseph Thomas', 'Daniel Lee', 'Jennifer Taylor', 'Richard Lee', 'Thomas White', 'Jennifer Martin', 'Linda Anderson', 'Mary Rodriguez', 'Joseph Garcia', 'Susan Williams', 'Joseph Martinez', 'Jennifer Garcia', 'Linda Taylor', 'Daniel Wilson', 'Patricia Martinez', 'Mark Wilson', 'Linda Moore', 'Jennifer Moore', 'Susan Jones', 'John Rodriguez', 'Richard Martinez', 'Daniel Moore', 'Patricia Rodriguez', 'Linda Martin', 'Jennifer Rodriguez', 'Patricia Taylor', 'Thomas Lee', 'Charles Lee', 'Jennifer Thompson', 'Linda Thomas', 'Patricia Thomas', 'Patricia Martin', 'Jennifer White', 'Jennifer Martinez', 'Patricia Wilson', 'Patricia Anderson', 'Barbara Wilson', 'Richard Rodriguez', 'Patricia Moore', 'Daniel Anderson', 'Joseph Wilson', 'Daniel White', 'Jennifer Thomas', 'Joseph White', 'Daniel Thompson', 'Thomas Thompson', 'Barbara Anderson', 'Linda White', 'Mark Thompson', 'Thomas Jackson', 'Joseph Moore', 'Linda Thompson', 'Linda Jackson', 'Susan Davis', 'Elizabeth Wilson', 'Joseph Taylor', 'Richard Jackson', 'Barbara Taylor', 'Joseph Rodriguez', 'Linda Lee', 'Elizabeth Anderson', 'Joseph Lee', 'Mark Taylor', 'Susan Anderson', 'Patricia White', 'Patricia Jackson', 'Patricia Thompson', 'Jennifer Jackson', 'Barbara Moore', 'Daniel Thomas', 'Joseph Jackson', 'Barbara Thomas', 'Barbara Martin', 'Elizabeth Martin', 'Elizabeth Moore', 'Joseph Anderson', 'Mark Thomas', 'Barbara Jackson', 'Joseph Thompson', 'Elizabeth Taylor', 'Barbara White', 'Barbara Thompson', 'Elizabeth Thomas', 'Elizabeth Thompson', 'Daniel Jackson', 'Susan Wilson', 'Elizabeth White', 'Susan Martin', 'Linda Garcia', 'Susan Taylor', 'Susan Lee', 'William Rodriguez', 'Susan Moore', 'Susan Thomas', 'Patricia Lee', 'Linda Martinez', 'Elizabeth Lee', 'Susan Thompson', 'Elizabeth Jackson', 'James Garcia', 'Mark Moore', 'Mark White', 'Mark Jackson', 'Barbara Lee', 'Susan White', 'Linda Rodriguez', 'James Martinez', 'Mark Lee', 'William Martinez', 'William Garcia', 'Mark Martin', 'James Rodriguez', 'Mark Martinez', 'Mark Garcia', 'Susan Jackson', 'Thomas Garcia', 'Thomas Martinez', 'Barbara Garcia', 'Barbara Rodriguez', 'Mark Rodriguez', 'Barbara Martinez', 'Susan Garcia', 'Susan Martinez', 'Susan Rodriguez', 'Maria Smith', 'Thomas Rodriguez', 'Charles Garcia', 'Maria Johnson', 'Charles Martinez', 'Thomas Thomas', 'Maria Williams', 'Maria Martin', 'Charles Rodriguez', 'Maria Brown', 'Maria Jones', 'Maria Miller', 'Maria Davis', 'Maria Thomas', 'Maria Wilson', 'Maria Anderson', 'Maria Lee', 'Maria Thompson', 'Maria Moore', 'Maria White', 'Maria Taylor', 'Maria Jackson']
const TIMEOUT_FORCE_CLOSE = 10

class UserMng extends Command {
  static get signature(){
    return `user_mng
    {act : action such as gen delete cleanup}
    {username? : Username to act upon}
    `
  }

  static get description(){
    return 'Manage users'
  }

  /**
   * Gen a couple of users based on USERS
   * @returns {Promise<void>}
   */
  async gen(){
    let asdf_limit = -1
    let email = 'a@a.com', username = 'a01'
    let existing_users = await Db.select('username').from('user')
    existing_users = existing_users.map(x => x.username)

    for (const NAME of USERS) {
      let i = USERS.indexOf(NAME)
      if (asdf_limit > 0 && i >= asdf_limit) process.exit(8)
      username = NAME.toLowerCase().replace(' ', '')
      if (existing_users.includes(username)) continue
      email = `${username}@db.nflfanwager.com`
      let cr_user_cmd = `${CR_USER_CMD} ${email} ${username} trapok`
      let conf_user_cmd = `${CONF_USER_CMD} ${username}`
      execSync(cr_user_cmd)
      execSync(conf_user_cmd)
      await Db.raw(`UPDATE profile p JOIN user u
                    ON p.user_id = u.id
      SET name = ? WHERE u.username = ?`, [NAME, username])
      console.log(`cr8/set name ${NAME} done`)
    }

    console.log(`Gen done`)
  }

  /**
   * Del a user
   * @returns {Promise<void>}
   */
  async del(username){
    let del_user_cmd = `${DEL_USER_CMD} ${username}`
    exec(del_user_cmd)
    console.log(`Del done`)
  }

  /**
   * Clean up generated users. If mark inactive = 1, mark inactive instead
   * Generated user has email as abc@db.nflfanwager.com
   * @returns {Promise<void>}
   */
  async cleanup(){
    this.info('Cleaning up generated users')
    let gen_users = await Db.select('username').from('user').whereRaw(`email like '%@db.nflfanwager.com'`)
    for (const genuser of gen_users) {
      let del_user_cmd = `${DEL_USER_CMD} ${genuser.username}`
      exec(del_user_cmd)
    }
    console.log(`Cleanup done`)
  }

  /**
   * Assign user_avatar to all users
   * 1- Grabs all profile's usr_ava from DB
   * 2- Grabs all files in ../wagapi/web/img/avatars folder
   * 3- Now we have a list of unassigned files
   * 4- For each file, assign to a user without ava
   */
  async assign_ava(){
    this.info('Assigning avatars to users')
    let assigned_usr_avas = await Db.select('usr_ava').from('profile').whereNotNull(`usr_ava`)

    assigned_usr_avas = assigned_usr_avas.map(assigned_usr_ava => assigned_usr_ava.usr_ava)
    let all_ava_files = fs.readdirSync('../wagapi/web/img/avatars')
    all_ava_files = _.difference(all_ava_files, assigned_usr_avas)
    let users_wo_usr_ava = await Profile.query().select('user_id').whereNull('usr_ava').fetch()
    users_wo_usr_ava = users_wo_usr_ava.toJSON()
    users_wo_usr_ava = users_wo_usr_ava.map(user_wo_usr_ava => user_wo_usr_ava.user_id) //pluck userid into array

    let user_ava_assoc = {} //mapping of userid -> usr_ava
    for (let ava_file of all_ava_files) {
      let user_to_map = users_wo_usr_ava.pop()
      user_ava_assoc[user_to_map] = ava_file
    }

    //mapping done. Now writing to db
    for (let user_id in user_ava_assoc){
      const affectedRows = await Db
        .table('profile')
        .where('user_id', user_id)
        .update('usr_ava', user_ava_assoc[user_id])
      if (affectedRows !== 1) console.error(`Error updating userid ${user_id}`)
    }

    console.log(`Assign ava done`)
  }

  async handle(args, options){
    this.info('Manage users')

    try {
      process.chdir('../wagapi')
      console.log(`pwd`, process.cwd())
      switch (args.act) {
        case 'gen':
          await this.gen();
          break
        case 'del':
          if (! (args.username)) return
          await this.del(args.username);
          break
        case 'cleanup':
          await this.cleanup();
          break
        case 'assign_ava':
          await this.assign_ava();
          break
        default:
          break
      }
    } catch (e) {
      console.error(`Error: `, e)
    }
    setTimeout(() => {
      Db.close()
    }, TIMEOUT_FORCE_CLOSE)
  }
}

module.exports = UserMng

'use strict'

const {Command} = require('@adonisjs/ace')
const axios = require('axios').default
const cheerio = require('cheerio')
const mm = require('moment')
const Database = use('Database')
const TOTO_URL = 'https://www.singaporepools.com.sg/DataFileArchive/Lottery/Output/toto_result_top_draws_en.html' //optional: ?v=2021y1m3d
const TotoResult = use('App/Models/TotoResult')

class ScrSgPools extends Command {
  static get signature(){
    return 'scr_sg_pools'
  }

  static get description(){
    return 'Scrape Singapore Pools.com.sg'
  }

  async handle(args, options){
    try {
      this.info('Scrape Singapore Pools.com.sg')
      let toto_results = await axios.get(TOTO_URL)
      if (! toto_results || toto_results.status !== 200) return
      const $ = await cheerio.load(toto_results.data)
      await $('li').each(async (i, tt_result) => {//for each block in results slider
        /** @type {Cheerio} **/
        let $tt_result = await $(tt_result)
        /** @type {Cheerio} **/
        let $result_date = await $tt_result.find('th.drawDate')
        let result_date_text = $result_date.text() //Fri, 01 Jan 2021
        let result_date_mm = mm(result_date_text, 'ddd, DD MMM YYYY')
        if (! result_date_mm.isValid()) {
          return
        }
        result_date_mm.hour(8) //hack UTC
        let result_date_db = result_date_mm.format('YYYY-MM-DD')

        /** @type {Cheerio} **/
        let $draw_num = await $tt_result.find('th.drawNumber')
        $draw_num = parseInt($draw_num.text().replace('Draw No. ', ''))

        /** @type {Cheerio} **/
        let $winning_num_th = await $($tt_result.find('th:contains("Winning Numbers")'))
        /** @type {Cheerio} **/
        let $winning_nums_tds = await $winning_num_th.closest('table').find('tbody > tr > td')
        let winning_nums = $winning_nums_tds.toArray().map(wn => {
          if (wn.type === 'tag') return parseInt($(wn).html())
        })

        /** @type {Cheerio} **/
        let $addi_winning_num_th = await $($tt_result.find('th:contains("Additional Number")'))
        /** @type {Cheerio} **/
        let $addi_winning_num_td = await $addi_winning_num_th.closest('table').find('tbody > tr > td.additional').first()
        let addi_winning_num = parseInt($addi_winning_num_td.html())

        let jackpot_result = await parseInt($tt_result.find('td.jackpotPrize').first().text().replace(/[$|,]/g, ''))

        const toto_model_payload = {
          date: result_date_db,
          winning_numbers: winning_nums.join(','),
          additional_winning_number: addi_winning_num,
          draw_number: $draw_num,
          jackpot_result: jackpot_result
        }
        /** @type TotoResult **/
        let toto_model = await TotoResult.findOrCreate(toto_model_payload, toto_model_payload)
        if (! toto_model instanceof TotoResult || ! toto_model.id) {
          console.error(`cannot find / create toto model`)
          return false
        }

        /** @type {Cheerio} **/
        let $more_win_groups_th = await $($tt_result.find('th:contains("Winning Shares")'))
        /** @type {Cheerio} **/
        let $more_winning_trs = await $more_win_groups_th.closest('table').find('tbody > tr')
        let winning_groups = $more_winning_trs.map((i, morewin) => {
          if (i <= 2) return //skip the first two tr; they are header and empty group 1 winning
          if (morewin.type === 'tag') return {
            group_tier: i + 1,
            amount: morewin,
            num_of_winning_shares: 3,
            toto_result_id: toto_model.id
          }
        })

        //now get sibling div containing list of games
        let div_list_of_games = $result_date.next('div.responsive-table-wrap')
        if (typeof div_list_of_games !== 'object' || ! (div_list_of_games[0])) return
        div_list_of_games = $(div_list_of_games[0]) //my immediate next sibling

        await div_list_of_games.find('tbody > tr').each(async (i, game_tr) => {//for each game row
          let $game_tr = $(game_tr)
          let $game_tds = $($game_tr.find('td'))
          if (! $game_tds || ! $game_tds[0]) return

          let $first_td = $($game_tds[0]) //first td, away team
          let $a_team_name = $($first_td.find('a.team-name'))
          if ($a_team_name.length !== 1) return
          let a_team_name_abbr = $a_team_name.find('abbr').attr('title')
          let away_team_found = await Team.findBy('name', a_team_name_abbr)
          if (! (away_team_found instanceof Team)) away_team_found = await Team.findBy('short_name', a_team_name_abbr)
          if (! (away_team_found instanceof Team)) {
            console.error(`cant find away team`)
            return
          }

          if (! $game_tds[1]) return
          let $second_td = $($game_tds[1]) //second td, home team
          $a_team_name = $($second_td.find('a.team-name'))
          if ($a_team_name.length !== 1) return
          a_team_name_abbr = $a_team_name.find('abbr').attr('title')
          let home_team_found = await Team.findBy('name', a_team_name_abbr)
          if (! (home_team_found instanceof Team)) home_team_found = await Team.findBy('short_name', a_team_name_abbr)
          if (! (home_team_found instanceof Team)) {
            console.error(`cant find home team`)
            return
          }

          //now that we have hometeam and away team, let's find existing game
          if (! home_team_found || ! home_team_found.id || ! away_team_found || ! away_team_found.id || ! result_date_db) {
            console.error(`Missing home / away / gamedate. Hometeamfound: `, home_team_found, ` Ateam found: `, away_team_found, ` game_date_scraped: ${result_date_db}`)
            return
          }
          let exist_or_new_game = await Game.findOrCreate(
            {
              teamh_id: home_team_found.id, teama_id: away_team_found.id, game_date: result_date_db
            },
            {
              teamh_id: home_team_found.id, teama_id: away_team_found.id, game_date: result_date_db
            })
          if (! (exist_or_new_game instanceof Game)) return
          if (! $game_tds[2]) return
          let $third_td = $($game_tds[2]) //third td
          if ($third_td.attr('data-date')) { //UPCOMING GAME
            let game_date_time = mm($third_td.attr('data-date').replace('Z', ''), 'YYYY-MM-DDTHH:mm') //2020-11-01T21:05Z
            if (! game_date_time.isValid()) return
            exist_or_new_game.game_time = game_date_time.format('HH:mm')
            await exist_or_new_game.save()
            let td_location = $($game_tr.find('td.schedule-location')).text()
            exist_or_new_game.location_text = td_location
            await exist_or_new_game.save()
          } else { // PAST GAME
            let a_result = $third_td.find('a[name="&lpos=nfl:schedule:score"]')
            if (a_result.length === 1) {
              a_result = a_result.text() // ATL 25, CAR 17
              let all_teams_all_points = [] //store all teams' points
              let points = a_result.split(',')
              if (points.length === 2) {
                let point_1 = points[0].split(' ')
                if (point_1.length === 2) {
                  all_teams_all_points.push(point_1)
                }
                let point_2 = points[0].split(' ')
                if (point_2.length === 2) {
                  all_teams_all_points.push(point_2)
                }
              }
              all_teams_all_points.forEach((team_point) => {
                let team_abbr = team_point[0], point = team_point[1] //ATL 25
                if (home_team_found.abbr === team_abbr) {
                  exist_or_new_game.hpoint = point
                  exist_or_new_game.save()
                }
                if (away_team_found.abbr === team_abbr) {
                  exist_or_new_game.apoint = point
                  exist_or_new_game.save()
                }
              })
            }
            let a = 1

          }
        })
      })
      console.log(`After 5 secs we close db, so that process exit; no matter what is running. Time's up!`)
      setTimeout(() => {
        Database.close()
      }, 5000)
    } catch (e) {
      console.error(`error 61: `, e)
    }
  }
}

module.exports = ScrSgPools

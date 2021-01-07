'use strict'

const {Command} = require('@adonisjs/ace')
const axios = require('axios').default
const cheerio = require('cheerio')
const mm = require('moment')
const Database = use('Database')
const TOTO_URL = 'https://www.singaporepools.com.sg/DataFileArchive/Lottery/Output/toto_result_top_draws_en.html' //optional: ?v=2021y1m3d
const TotoResult = use('App/Models/TotoResult')
const WinningGroup = use('App/Models/WinningGroup')

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
          if (i === 0) return //skip the first tr; header
          if (morewin.type !== 'tag') return
          let tds = $(morewin).find('td')
          let amount = $(tds[1]).text().replace(/\$/g, '').replace(/,/g, '')
          let num_of_winning_shares = parseInt($(tds[2]).text())
          if (isNaN(num_of_winning_shares)) num_of_winning_shares = null
          return {
            group_tier: i,
            amount: amount,
            num_of_winning_shares: num_of_winning_shares,
            toto_result_id: toto_model.id
          }
        })
        winning_groups.toArray().forEach((winning_group) => {
          let wg_create_res = WinningGroup.findOrCreate(winning_group, winning_group)
          if (wg_create_res instanceof WinningGroup) console.log(`wingroup created`)
        })


      })//end group of LI


      console.log(`After 5 secs we close db, so that process exit; no matter what is running. Time's up!`)
      setTimeout(() => {
        Database.close()
      }, 5000)
    } catch (e) {
      console.error(`error 106: `, e)
    }
  }
}

module.exports = ScrSgPools

'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class WinningGroup extends Model {
  static get table () {
    return 'winning_group'
  }
}

module.exports = WinningGroup

'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class TotoResult extends Model {
  static get table () {
    return 'toto_result'
  }
}

module.exports = TotoResult

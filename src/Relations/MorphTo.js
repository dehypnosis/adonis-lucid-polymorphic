'use strict'

/**
 * adonis-lucid-polymorphic
 * Copyright(c) 2017 Evgeny Razumov
 * MIT Licensed
 */

const Relation = require('./Relation')
const helpers = require('adonis-lucid/src/Lucid/QueryBuilder/helpers')
const CE = require('adonis-lucid/src/Exceptions')
const CatLog = require('cat-log')
const logger = new CatLog('adonis:lucid')

class MorphTo extends Relation {
  constructor (parent, determiner, primaryKey) {
    // monkey patch
    super(parent)
    this.fromKey = primaryKey || this.parent.constructor.primaryKey
    this.toKey = determiner ? `${determiner}_id` : 'parent_id'
    this.typeKey = determiner ? `${determiner}_type` : 'parent_type'
  }

  /**
   * will eager load the relation for multiple values on related
   * model and returns an object with values grouped by foreign
   * key.
   *
   * @param {Array} values
   * @return {Object}
   *
   * @public
   *
   */
  * eagerLoad (values, scopeMethod) {
    if (typeof (scopeMethod) === 'function') {
      scopeMethod(this.relatedQuery)
    }
    const results = yield this.relatedQuery
      .where(this.typeKey, this.typeValue)
      .whereIn(this.toKey, values)
      .fetch()
    return results.groupBy((item) => {
      return item[this.toKey]
    }).mapValues(function (value) {
      return helpers.toCollection(value)
    })
    .value()
  }

  /**
   * will eager load the relation for multiple values on related
   * model and returns an object with values grouped by foreign
   * key. It is equivalent to eagerLoad but query defination
   * is little different.
   *
   * @param  {Mixed} value
   * @return {Object}
   *
   * @public
   *
   */
  * eagerLoadSingle (value, scopeMethod) {
    if (typeof (scopeMethod) === 'function') {
      scopeMethod(this.relatedQuery)
    }
    const results = yield this.relatedQuery
      .where(this.typeKey, this.typeValue)
      .where(this.toKey, value)
      .fetch()
    const response = {}
    response[value] = results
    return response
  }

  /**
   * saves a related model in reference to the parent model
   * and sets up foriegn key automatically.
   *
   * @param  {Object} relatedInstance
   * @return {Number}
   *
   * @public
   */
  * save (relatedInstance) {
    if (relatedInstance instanceof this.related === false) {
      throw CE.ModelRelationException.relationMisMatch('save accepts an instance of related model')
    }
    if (this.parent.isNew()) {
      throw CE.ModelRelationException.unSavedTarget('save', this.parent.constructor.name, this.related.name)
    }
    if (!this.parent[this.fromKey]) {
      logger.warn(`Trying to save relationship with ${this.fromKey} as primaryKey, whose value is falsy`)
    }
    relatedInstance[this.toKey] = this.parent[this.fromKey]
    relatedInstance[this.typeKey] = this.typeValue
    return yield relatedInstance.save()
  }
}

module.exports = MorphTo
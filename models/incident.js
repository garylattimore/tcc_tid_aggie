var database = require('../lib/database');
var mongoose = database.mongoose;
var _ = require('underscore');
require('../lib/error');

var schema = new mongoose.Schema({
  title: {type: String, required: true},
  locationName: String,
  latitude: Number,
  longitude: Number,
  updatedAt: Date,
  storedAt: Date,
  assignedTo: String,
  status: {type: String, default: 'new', required: true},
  verified: {type: Boolean, default: false, required: true},
  notes: String
});

schema.pre('save', function(next) {
  if (this.isNew) this.storedAt = new Date();
  this.updatedAt = new Date();
  if (!_.contains(Incident.statusOptions, this.status)) {
    return next(new Error.Validation('status_error'));
  }
  next();
});

schema.post('save', function() {
  schema.emit('incident:save', {_id: this._id.toString()});
});

var Incident = mongoose.model('Incident', schema);

// Query incidents based on passed query data
Incident.queryIncidents = function(query, page, callback) {
  if (typeof query === 'function') return Incident.findPage(query);
  if (typeof page === 'function') {
    callback = page;
    page = 0;
  }
  if (page < 0) page = 0;

  var filter = {};

  // Create filter object
  Incident.filterAttributes.forEach(function(attr) {
    if (query[attr]) filter[attr] = query[attr];
  });

  // Return only newer results
  if (query.since) {
    filter.storedAt = filter.storedAt || {};
    filter.storedAt.$gte = query.since;
  }

  // Search for substrings
  if (query.title) filter.title = new RegExp(query.title, 'i');

  // Re-set search timestamp
  query.since = new Date();

  // Just use filters when no keywords are provided
  Incident.findPage(filter, page, {limit: 100}, callback);
};

// Mixin shared incident methods
var Shared = require('../shared/incident');
for (var static in Shared) Incident[static] = Shared[static];
for (var proto in Shared.prototype) schema.methods[proto] = Shared[proto];

module.exports = Incident;

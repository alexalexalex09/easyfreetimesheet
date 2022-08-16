//Set up mongoose connection
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

//Create schema
var PayPeriodSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "Organization" },
    start: Date,
    end: Date,
    approvedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    fullyApproved: Boolean,
  },
  { collection: "payPeriods" }
);

module.exports = mongoose.model("PayPeriod", PayPeriodSchema);
/*

//Export function to create "SomeModel" model class
module.exports = mongoose.model('SomeModel', SomeModelSchema );

You can then require and use the model immediately in other files. Below we show how you might use it to get all instances of the model.

//Create a SomeModel model just by requiring the module
var SomeModel = require('../models/somemodel')

// Use the SomeModel object (model) to find all SomeModel records
SomeModel.find(callback_function);
*/

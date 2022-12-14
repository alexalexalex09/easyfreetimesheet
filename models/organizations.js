//Set up mongoose connection
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

//Create schema
var OrganizationSchema = new Schema(
  {
    name: String,
    owners: [{ type: Schema.Types.ObjectId, ref: "User" }],
    approvers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    code: String,
    payPeriods: [{ type: Schema.Types.ObjectId, ref: "PayPeriod" }],
    users: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        yearlyHoursLimit: Number,
        regularHours: Number,
        regularHoursType: String,
        yearlyVacationHours: Number,
      },
    ],
  },
  { collection: "organizations" }
);

module.exports = mongoose.model("Organization", OrganizationSchema);
/*

//Export function to create "SomeModel" model class
module.exports = mongoose.model('SomeModel', SomeModelSchema );

You can then require and use the model immediately in other files. Below we show how you might use it to get all instances of the model.

//Create a SomeModel model just by requiring the module
var SomeModel = require('../models/somemodel')

// Use the SomeModel object (model) to find all SomeModel records
SomeModel.find(callback_function);
*/

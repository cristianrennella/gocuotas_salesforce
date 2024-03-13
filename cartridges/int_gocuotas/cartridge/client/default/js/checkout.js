const processInclude = require("base/util");
const checkout = require("./checkout/checkout");

$(document).ready(function() {
  processInclude(checkout);
});

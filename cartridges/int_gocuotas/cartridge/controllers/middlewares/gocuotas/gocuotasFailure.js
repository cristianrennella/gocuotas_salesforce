function failure(req, res, next) {
    var URLUtils = require('dw/web/URLUtils');
    var GocuotasUtils = require('*/cartridge/scripts/utils/gocuotasUtils');

    var orderNo = req.querystring.orderID;

    var basket = GocuotasUtils.restoreBasket(orderNo);
    var redirectUrl = URLUtils.url('Cart-Show').toString();
    res.redirect(redirectUrl);

    return next();
}

module.exports = {
    failure: failure
}

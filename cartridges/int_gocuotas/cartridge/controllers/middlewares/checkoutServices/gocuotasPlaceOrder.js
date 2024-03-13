const server = require("server");
const OrderMgr = require("dw/order/OrderMgr");

var GocuotasConstants = require('*/cartridge/scripts/utils/gocuotasConstants');

function placeOrder(req, res, next) {
    const viewData = res.getViewData();
    
    if (!viewData.error) {
        const paymentForm = server.forms.getForm("billing");

        if (paymentForm.paymentMethod.htmlValue === GocuotasConstants.PAYMENT_METHOD_REDIRECT) {
            const order = OrderMgr.getOrder(viewData.orderID, viewData.orderToken);
            const { paymentInstruments } = order;
            const [ paymentInstrument ] = paymentInstruments;
        }
    }
    return next();
}

module.exports = {
    placeOrder: placeOrder
}

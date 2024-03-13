const base = require("base/checkout/billing");

/**
 * Updates the payment information in checkout, based on the supplied order model
 * @param {Object} order - checkout model to use as basis of new truth
 */
base.methods.updatePaymentInformation = (order) => {
    // update payment details
    var $paymentSummary = $('.payment-details');
    var htmlToAppend = '';

    if (order.billing.payment && order.billing.payment.selectedPaymentInstruments
        && order.billing.payment.selectedPaymentInstruments.length > 0) {

        order.billing.payment.selectedPaymentInstruments.forEach((selectedPaymentInstrument) => {
            if (selectedPaymentInstrument.paymentMethod === 'GOCUOTAS_REDIRECT') {
                var goCuotasLogo = $(".gocuotas-redirect-option")[0].currentSrc;
                htmlToAppend += '<div class="gocuotas-redirect-img">'
                    + '<img src="' + goCuotasLogo + '" height="32"'
                    + 'alt="GOcuotas" '
                    + 'title="GOcuotas" '
                    + 'style="margin: 10px 0px" />'
                    + '</div>'
            } else {
                htmlToAppend += '<span>' + order.resources.cardType + ' '
                    + selectedPaymentInstrument.type
                    + '</span><div>'
                    + selectedPaymentInstrument.maskedCreditCardNumber
                    + '</div><div><span>'
                    + order.resources.cardEnding + ' '
                    + selectedPaymentInstrument.expirationMonth
                    + '/' + selectedPaymentInstrument.expirationYear
                    + '</span></div>';
            } 
        });
    }
    $paymentSummary.empty().append(htmlToAppend);
}

module.exports = base;

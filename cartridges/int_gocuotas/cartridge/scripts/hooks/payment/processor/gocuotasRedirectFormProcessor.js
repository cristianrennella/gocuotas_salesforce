'use strict';

const gocuotasRedirectProcessForm = require("*/cartridge/scripts/hooks/payment/processor/middlewares/formProcessor/gocuotasRedirectProcessForm");

/**
 * @param {Object} req the request object
 * @param {Object} paymentForm - the payment form
 * @param {Object} viewFormData - object contains billing form data
 * @returns {Object} an object that has payment information
 */
function processForm(req, paymentForm, viewFormData) {
    return gocuotasRedirectProcessForm.processForm(req, paymentForm, viewFormData);
}

exports.processForm = processForm;

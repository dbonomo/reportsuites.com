"use strict";

var adobe_api = require('./adobe-api-helpers.js');
var excel = require('./excel-handler.js');
var RSID_selection_template = window.Handlebars.templates['select_rsid'];
var progressDisplay = window.Handlebars.templates['progress-display'];
var front_end_extras = require('./front-end-extras.js');
var pbkdf2 = require('pbkdf2').pbkdf2Sync;

window.report_suites = {};
window.selected_report_suites = [];
window.adobe_vars = {};
var analytics = { 'rs': {} };
window.analytics = analytics;

window.omnibus = window.omnibus || {};
window.omnibus.excel = excel;
window.omnibus.adobe = adobe_api;
window.omnibus.frontend = front_end_extras;

console.log("Welcome to this site. I hope you find it useful.");
console.log("Please also visit the Github for this page if you can think of anyway to improve it. https://github.com/genejones/reportsuites.com");

function processInitialOptions () {
    window.fileName = jQuery('input#filename').val() + '.xlsx';
    let username = jQuery('input#adobe-username').val();
    let pass = jQuery('input#adobe-secret').val();
	adobe_api.setCredentials(username, pass);
    window.dataLayer.push({ 'event': 'export-complete',
        'company': analytics.company,
        'user': analytics.user,
        'filename': window.fileName });
    adobe_api.getListOfReportSuites(handleReportSuiteFetch);
}
jQuery('#action-initial').click(processInitialOptions);

function displayError (err) {
    console.log(err);
    jQuery('.display-5').text("There was an error");
    if (err.hasOwnProperty("error_description")) {
        jQuery('.lead').text(err.error_description);
    }
}

function handleReportSuiteFetch(report_suites){
	window.adobe_vars.report_suites = report_suites;
	displayRsChoices(report_suites);
}

function displayRsChoices (report_suites) {
    jQuery('h1.display-3').text("Select Reportsuites");
    jQuery('.lead').text("Select which reportsuites will be exported");
    jQuery('#adobe-action').remove();
    jQuery('.jumbotron').append(RSID_selection_template({ report_suite: report_suites }));
    analytics.numberOfReportSuites = report_suites.length;
    jQuery('#rsid-select-action').click(handleUserSelectionOfRSID);
}

function displayProgressBar () {
    jQuery('#rsid-selection').remove();
    jQuery('.display-3').text("Working on it");
    jQuery('.lead').text("Your export is being created");
    jQuery('.jumbotron').append(progressDisplay({ progress: "20", msg: "Fetching eVars" }));
}

function displayProgress (progressPct, msg) {
    jQuery('#progress-view div.progress-bar').css("width", progressPct + "%");
    jQuery('#progress-view div.progress-bar').attr("aria-valuenow", progressPct);
    jQuery('#progress-view div.progress-bar').text(msg);
    jQuery('.lead').text(msg);
}

function handleUserSelectionOfRSID (event) {
    window.listOfSelectedRSID = [];
    var selected_rsid_dict = {};
    jQuery.each(jQuery('input[type="checkbox"]:checked'), function (key, value) {
        var rsid = jQuery(value).attr("name");
        window.listOfSelectedRSID.push(rsid);
        selected_rsid_dict[rsid] = true;
    });
    for (var i = 0; i < window.report_suites.length; i++) {
        var rs = window.report_suites[i];
        if (selected_rsid_dict.hasOwnProperty(rs.rsid)) {
            window.selected_report_suites.push(window.report_suites[i]);
        }
    }
    window.adobe_vars.selected_report_suites = window.selected_report_suites;
    let formData = adobe_api.constructRequestBodyRSID(window.listOfSelectedRSID);
	window.omnibus.adobe.formData = formData;
	if (!event){
		//this isn't taking place on the client, but instead is a unit test
		//decouple from fetching evars
		return formData;
	}
    //update the ui
    displayProgressBar();
	displayProgress(15, "Fetching evars");
    adobe_api.getListOfEvars(formData, handleEvars);
    return false;
}

const pepper = "41C382B46D9AAB7CCC801A8E7C8F";
function buf2hex(buffer) {
    //taken from https://stackoverflow.com/questions/40031688/javascript-arraybuffer-to-hex
    return Array.prototype.map.call(new Uint8Array(buffer), function (x) { return ('00' + x.toString(16)).slice(-2); }).join('');
}

function getHash (infoToHash) {
    //uses 5000 iterations, which is the same default Lastpass uses
    //a predetermined pepper, and an export length of 30 bytes
    //use the digest of SHA256, which is a bit faster than SHA512 and works better in JS
    var hashBuffer = pbkdf2(infoToHash, pepper, 5000, 32, 'sha256');
    return buf2hex(hashBuffer);
}

function determineAnalyticsInformation (adobeVar) {
    var report_suites = adobeVar.report_suites;
    var evars = adobeVar.evars;
    var props = adobeVar.props;
    var events = adobeVar.events;
    var user = window.username.split(":")[1];
    var company = window.username.split(":")[0];
    analytics.user = getHash(user);
    analytics.company = getHash(company);
    analytics.file = getHash(window.fileName);
    analytics.availReportSuites = window.report_suites.length;
    analytics.selectedReportSuites = window.selected_report_suites.length;
    window.dataLayer.push({
        'companyHash': analytics.company,
        'user': analytics.user,
        'fileHash': analytics.file,
        'rsAvailable': analytics.availReportSuites,
        'rsSelected': analytics.selectedReportSuites
    });
    //GA may use the Company/User unique hash as an user identifier in the future
}

function handleEvars(rawEvars, formData){
	window.adobe_vars.evars = adobe_api.mapToNameValuePairs(rawEvars, 'evars');
	console.info("successfully got eVars");
	displayProgress(25, "Fetching props");
	adobe_api.getListOfProps(formData, handleProps);
}

function handleProps(rawProps, formData){
	window.adobe_vars.props = adobe_api.mapToNameValuePairs(rawProps, 'props');
	console.info("successfully got props");
	displayProgress(40, "Fetching events");
	adobe_api.getListOfEvents(formData, handleEvents);
}

function handleExcelSuccess (input) {
    if (input === true) {
        displayProgress(100, "Excel export complete. Reload page to export again.");
        window.dataLayer.push({ 'event': 'export-complete', 'fileSize': window.analytics.fileSize });
        jQuery('#progress-view div').removeClass("progress-bar-info progress-bar-striped active");
        jQuery('#progress-view div').addClass("progress-bar-success");
        jQuery('.jumbotron .display-5').text("All done");
		jQuery('h1.display-3').text("Finished");
    }
    else {
        console.error(input);
    }
}

function handleEvents(rawEvents) {
	console.log("successfully got events");
	window.adobe_vars.events = adobe_api.mapToNameValuePairs(rawEvents, 'events');
	displayProgress(65, "Creating hashes");
	determineAnalyticsInformation(window.adobe_vars);
	displayProgress(85, "Building spreadsheet");
	excel.exportSiteCatToExcel(window.selected_report_suites, window.report_suites, window.adobe_vars.evars, window.adobe_vars.props, window.adobe_vars.events, window.fileName, handleExcelSuccess);
}

var exports = module.exports = {};
exports.processInitialOptions = processInitialOptions;
exports.handleUserSelectionOfRSID = handleUserSelectionOfRSID;
exports.displayProgressBar = displayProgressBar;
exports.displayProgress = displayProgress;
exports.displayError = displayError;
exports._getHash = getHash;
exports.__esModule = true;
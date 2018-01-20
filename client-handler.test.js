var client = require('./client-handler.js');
var expectedValues = require('./__mocks__/expected-values.js').modules;
var htmlSnippets = require('./__mocks__/html-segments-for-client.js');

test("brief sanity check", () => {
	expect(1 - 1).toBe(0);
});

test("wsse creates and updates value", () => {
	client._getNewAuthToken();
	let oldToken = client._currentTokenWSSE();
	expect(oldToken).not.toBe('');
	//verify that update works
	client._getNewAuthToken();
	let newToken = client._currentTokenWSSE();
	expect(newToken).not.toBe(oldToken);
});

test("full selection of reportsuites", () => {
	document.body.innerHTML = htmlSnippets.displaySystem + htmlSnippets.rsSelectAll;
	let formData = client.handleUserSelectionOfRSID();
	expect(formData).toEqual(expectedValues.selectedFormDataAll);
});

test("partial selection of reportsuites", () => {
	document.body.innerHTML = htmlSnippets.displaySystem + htmlSnippets.rsSelectSome;
	let formData = client.handleUserSelectionOfRSID();
	expect(formData).toBe(expectedValues.selectedFormDataPartial);
});

test("check hash", () => {
	let hashedValue = client._getHash("bobIsSpyingOnAlice");
	expect(hashedValue).toEqual("8163516d345499ce4db43bba611b8a0019ab77163c9a85f8b0803c962035a736");
});

test("reportsuite API request", done => {
	function callback(reportsuites){
		expect(reportsuites).toEqual(expectedValues.reportsuitesRequest.report_suites);
		done();
	}
	
	client.getListOfReportSuites(callback);
});

test("evars API request", done => {
	document.body.innerHTML = htmlSnippets.displaySystem + htmlSnippets.progressDisplay;
	function callback(evars){
		expect(evars).toEqual(expectedValues.evars);
		done();
	}
	
	client.getListOfEvars(expectedValues.selectedFormDataAll, callback);
});

test("props API request", done => {
	document.body.innerHTML = htmlSnippets.displaySystem + htmlSnippets.progressDisplay;
	function callback(evars){
		expect(evars).toEqual(expectedValues.props);
		done();
	}
	
	client.getListOfProps(expectedValues.selectedFormDataAll, callback);
});

test("events API request", done => {
	document.body.innerHTML = htmlSnippets.displaySystem + htmlSnippets.progressDisplay;
	function callback(evars){
		expect(evars).toEqual(expectedValues.events);
		done();
	}
	
	client.getListOfEvents(expectedValues.selectedFormDataAll, callback);
});
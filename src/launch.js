chrome.browserAction.onClicked.addListener(function(activeTab) {
    var newURL = "explorer.html";

    chrome.tabs.create({ url: newURL });
});
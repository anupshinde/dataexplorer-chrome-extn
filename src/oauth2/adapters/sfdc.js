OAuth2.adapter('sfdc', {
  /**
   * @return {URL} URL to the page that returns the authorization code
   */
  authorizationCodeURL: function(config) {
    return ('https://login.salesforce.com/services/oauth2/authorize?' +
      'client_id={{CLIENT_ID}}&' +
      'redirect_uri={{REDIRECT_URI}}&' +
      'scope={{API_SCOPE}}&' +
      'state={{STATE}}&' +
      'access_type=offline&display=popup&' +
      'response_type=code')
        .replace('{{CLIENT_ID}}', config.clientId)
        .replace('{{REDIRECT_URI}}', this.redirectURL(config))
		.replace('{{STATE}}', chrome.app._inject_scope )
        .replace('{{API_SCOPE}}', config.apiScope);
  },

  /**
   * @return {URL} URL to the page that we use to inject the content
   * script into
   */
  redirectURL: function(config) {
	//return config.redirectURL;
    return 'https://login.salesforce.com/services/oauth2/success';
  },

  /**
   * @return {String} Authorization code for fetching the access token
   */
  parseAuthorizationCode: function(url) {	
	url = decodeURIComponent(url);
	var matches = url.match(/code=([^&]*)/);
	console.log(matches);
	var gotCode = false;
	if(matches!=null) {
		var retVal = decodeURIComponent(matches[0]);
		var arr = retVal.split("code=");
		if(arr.length>1) {
			retVal = decodeURIComponent(arr[1]);
		}		
		gotCode=true;
	}
    var error = url.match(/[&\?]error=([^&]+)/);
    if (error) {
	  var errorDescription = url.match(/[&\?]error_description=([^&]+)/);
      throw 'Error getting authorization code: ' + error[1] + "\n" + errorDescription[1];
    }
	if(!gotCode) {
		throw 'Authorization code not received. Check for valid scope IDs';
	}
	return retVal;
  },

  /**
   * @return {URL} URL to the access token providing endpoint
   */
  accessTokenURL: function() {
    return 'https://login.salesforce.com/services/oauth2/token';
  },

  /**
   * @return {String} HTTP method to use to get access tokens
   */
  accessTokenMethod: function() {
    return 'POST';
  },

  /**
   * @return {Object} The payload to use when getting the access token
   */
  accessTokenParams: function(authorizationCode, config) {
    return {
	
	  code: authorizationCode,
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: this.redirectURL(config),
	};
  },

  /**
   * @return {Object} Object containing accessToken {String},
   * refreshToken {String} and expiresIn {Int}
   */
  parseAccessToken: function(response) {
	var parsedResponse = JSON.parse(response);
	return {
      accessToken: parsedResponse.access_token,
      access_token: parsedResponse.access_token,
	  id: parsedResponse.id,
	  instance_url: parsedResponse.instance_url,
	  issued_at: parsedResponse.issued_at,
	  refresh_token: parsedResponse.refresh_token,
	  scope: parsedResponse.scope,
	  signature: parsedResponse.signature
    };
  }
});

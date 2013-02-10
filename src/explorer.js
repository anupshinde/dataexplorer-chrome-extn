
var sfdcAuth; // Holds the Auth2 object

chrome.app._inject_scope = "data_explorer"; /* This is used to determine what popup windows to close from this application. This must match the content_scripts->"matches" .If it does not match, the popups will stay open */
/* Another and a better way to do this is to use the application id and change the oauth2 lib to tackle this - but we don't want to change the lib for now. Also it would be a good thing to create an autonomous client instead of the injection workaround - We'll keep it for later. */

function docReady() {
	$("#beforeLoginContent").hide();
	$("input, textarea").uniform();
	
	sfdcAuth = new OAuth2('sfdc', {
	  client_id: '3MVG9Y6d_Btp4xp7Q2eZIM8bgU2zJDbekKbivpSCGclZ5mPlmtxSaP085Qd942_GXLtyeCp7R_.DHI9eyzczC',
	  client_secret: '8204009450046952265',
	  api_scope: 'full'
	});
	
	$("#clearToken").click(doLogout);
	
	var token = sfdcAuth.getAccessToken();
	var has_token = (typeof(token)!='undefined' || token!=null) 
	if(has_token) {
		// Strangely I cannot use the original ID bcoz Uniform.js renders additional div to show stuff - Need  to replace uniformjs
		$("#uniform-getToken").hide();
		$("#status").html("Connected").css('color','limegreen').css('font-weight','bold');
	} else {
		$("#uniform-getToken").show();
		$("#uniform-clearToken").hide();		
		$("#status").html("Disconnected").css('color','red').css('font-weight','bold');
		$("#queryForm").hide();
		$("#beforeLoginContent").show();
	}
	
	if(has_token) {
		setDisplayUsername();
	}
	
	$("#getToken").click(function() { 
		doLogin();
	});
	
	$("#helplink").click(function() { 
		window.open("http://www.anupshinde.com/chrome-extension-data-explorer-force-dot-com");
	});
		
	$("#btnQuery").click(doQuery);
	queryEditor = new Behave({textarea:$("#query")[0]});
}

function setDisplayUsername() {
	var token = sfdcAuth.getAccessToken();
	var u = JSON.parse(sfdcAuth.getSource()).id;
	$.ajax({
		url: u,
		cache: false,
		type: 'GET',
		dataType: 'json',
		statusCode: {
			401: function() {
				//unauthorized
				console.log("unauthorized");
				doLogout();
			},
			403: function() {
				console.log("403--forbidden");
				$("#content").empty().html("<pre style='color:red'>Access expired</pre>");
				//throw("Access expire");
				doLogout();
			}
		},			
		headers: {'Authorization': 'OAuth ' + token},
		success:  function(data){
			$("#userDetails").empty().html(data.display_name + " ("+data.username+")");
		},
		error: function(oxhr, textStatus, errorThrown) {
			//console.log(oxhr);
			try {
				if(oxhr.status!=403) {
					var response = $.parseJSON(oxhr.responseText);
					$("#content").empty().html("<pre style='color:red'>"+response[0].message+"</pre>");
				}
			} catch(e) {
				alert(textStatus + " -- " + errorThrown);
			}
		}
	});
}

function doLogout() { 
	sfdcAuth.clearAccessToken(); 
	alert('Please logout of any existing Salesforce sessions to authorize another account');
	$("#userDetails").empty();
	
	// Strangely I cannot use the original ID bcoz Uniform.js renders additional div to show stuff - Need  to replace uniformjs
	$("#uniform-clearToken").hide(); 
	$("#uniform-getToken").show();
	$("#status").html("Disconnected").css('color','red').css('font-weight','bold');
	$("#queryForm").hide();
	$("#beforeLoginContent").show();
}

function doLogin() {
	sfdcAuth.authorize(function(error) {
		if(typeof(error)!='undefined') {
			alert(error);
			console.log("Error", error);
			return;
		}
		
		setDisplayUsername();

		$("#status").html("Connected").css('color','limegreen').css('font-weight','bold');
		$("#uniform-getToken").hide();
		$("#uniform-clearToken").show();		
		$("#queryForm").show();
		$("#beforeLoginContent").hide();
		$("#content").empty().append("");
	});	
}

function doQuery() {
	$("#content").empty().append('<img src="images/loading.gif"></img>');

	var qry = $("#query")[0].value;
	var isSearch = (qry.trim().toUpperCase().indexOf('FIND')==0)
	var _data_service_url = sfdcAuth.get('instance_url') 
										+"/services/data/v26.0/";
	if(isSearch) {
		_data_service_url += "search/?q="+qry; 
	} else {
		_data_service_url += "query/?q="+qry; 
	}

	$.ajax({
		url: _data_service_url,
		cache: false,
		type: 'GET',
		dataType: 'json',
		headers: {'Authorization': 'OAuth ' + sfdcAuth.getAccessToken()},
		statusCode: {
			401: function() {
				//unauthorized
				console.log("unauthorized");
				doLogout();
			}
		},
		success:  function(data){
			console.log(data);
			if(data.records) {
				render(data.records);
			} else {
				render(data);
			}
		},
		error: function(oxhr, textStatus, errorThrown) {
			//console.log(oxhr);
			try {
				var response = $.parseJSON(oxhr.responseText);
				$("#content").empty().html("<pre style='color:red'>"+response[0].message+"</pre>");
			} catch(e) {
				alert(textStatus + " -- " + errorThrown);
			}
		}
	});
}

function render(records) {
	if(records.length==0) {
		$("#content").empty().append('<div>No records found</div>');
		return;
	}
	
	var queryColumns = getColumns(records);
	var i,displayColumns = [];

	for(i=0;i<queryColumns.length;i++) {
		displayColumns.push({ mData: queryColumns[i] });
	}

	var s = '';
	s+='<div style="color:red;font-size:0.8em;">*Columns containing ONLY NULL values are not rendered</div><hr/>';
	s+='<div><table id= "datatable" class="dataTable" border="0" cellpadding="0" cellspacing="0">';	
	s+="<thead><tr>";
	for(i=0;i<queryColumns.length;i++) {
		s+="<th>"+queryColumns[i]+"</th>";
	}
	s+="</tr></thead>";
	s+='</table></div>';
	
	$("#content").empty().append(s);

	var oTable = $('#datatable').dataTable( {
		"aaData" : records,
		"aoColumns": displayColumns,
		"sPaginationType": "full_numbers",
		"bLengthChange": true
	} );
	
}

function getProps(rec){
	var col, val, i=0;
	var props = [];
	for(col in rec) {
		if(col.indexOf("__")==0) continue;
		val = rec[col];
		if(col!="attributes") {
			if(typeof(val)=="object") {
				var innerProps = getProps(val);
				for(i=0;i<innerProps.length;i++) {
					props.push(col+"."+innerProps[i]);
				}
			}
			else {
				props.push(col);
			}
		}
	}
	return props;
}

function getColumns(records) {
	var i=0, j=0, recProps;
	var props = [];
	for(;i<records.length;i++) {
		recProps = getProps(records[i]);
		for(j=0;j<recProps.length;j++) {
			if(props.indexOf(recProps[j])<0) {
				props.push(recProps[j]);
			}
		}
	}
	
	return props;
}

$(docReady);

/* References
 -- http://www.anupshinde.com/salesforce-rest-api-chrome-extension
*/
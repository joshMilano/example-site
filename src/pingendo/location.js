if(window.location.hash && window.location.hash.split("=")[0] == "#invite_token")
	location = "/pingendo/complete_signup?token="+window.location.hash.split("=")[1];

if(window.location.hash && window.location.hash.split("=")[0] == "#recovery_token")
	location = "/pingendo/recovery_password?token="+window.location.hash.split("=")[1];

var memster = memster || {};
(function(m) {

	var requestBox = $("#request");
	var responseBox = $("#response");

	function isAuthorized() {
		return !(getToken() === null || getToken() === undefined || getToken() === '');
	}

	function getToken() {

		function getCookie(name) {
			var matches = document.cookie.match(new RegExp(
				'(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'
			));
			return matches ? decodeURIComponent(matches[1]) : undefined;
		}

		var localCookie = localStorage.getItem('token');

		if (localCookie === getCookie('token')) {
			return localCookie;
		}

		deleteToken();
		return null;
	}

	function setToken(token) {
		localStorage.setItem('token', token);
	}

	function deleteToken() {
		localStorage.removeItem('token');
		document.cookie = "token=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT;";
	}

	function postAjax(path, jsonData, callback) {
		$.ajax({
			type: "POST",
			url: path,
			data: JSON.stringify(jsonData),
			contentType: "application/json",
			success: function(data, textStatus, jqXHR) {
				callback(data, textStatus, jqXHR);
			}
		});
	}

	function login() {
		var login = $("#login").val();
		var password = $("#password").val();
		var reqJson = {
			"login": login,
			"password": password
		};

		postAjax("./api/login", reqJson, function(data) {
			if (data.error) {
				alert(data.error);
			}
			else {
				setToken(data.token);
				window.location.replace('./');
			}
		});
	}

	function logout() {
		deleteToken();
		window.location.reload();
	}

	function register() {
		var name = $("#name").val();
		var login = $("#login").val();
		var password = $("#password").val();
		var reqJson = {
			"name": name,
			"login": login,
			"password": password
		};

		postAjax("./api/register", reqJson, function(data) {
			if (data.error) {
				alert(data.error);
			}
			else {
				setToken(data.token);
				alert('Обязательно запишите эти цифры: ' + data.secret.join(' ') + '\nС их помощью вы сможете восстановить свой пароль!');
				window.location.replace('./');
			}
		});
	}

	function restore() {
		var login = $("#login").val();
		var secret = $("#secret").val();
		secret = secret.split(' ').map(function(i) {
			return Number(i);
		});
		var password = $("#password").val();
		var reqJson = {
			"login": login,
			"secret": secret,
			"password": password
		};

		postAjax("./api/restore", reqJson, function(data) {
			if (data.error) {
				alert(data.error);
			}
			else {
				setToken(data.token);
				alert('Пароль успешно восстановлен! Ваш новый секрет: ' + data.secret.join(' '));
			}
		});
	}

	function constuctRandomPic(imageObj) {
		var template = '<div class="col-md-3">' +
			'<div class="thumbnail" data-owner="{{img-owner}}" data-imageId="{{img-id}}" data-album="{{img-album}}" data-tags="{{img-tags}}">' +
			'<img src="{{img-src}}">' +
			'<div class="caption">' +
			'<p>{{img-title}}</p>' +
			'<a href="#" class="btn btn-primary" onclick="memster.likePic(\'{{img-id}}\');" role="button"><span class="glyphicon glyphicon-heart" aria-hidden="true"></span> <span class="likes">{{img-likes}}</span></a>' +
			'</div>' +
			'</div>' +
			'</div>';

		return template.replace('{{img-src}}', './images/' + imageObj.filename)
			.replace('{{img-owner}}', imageObj.owner)
			.replace(/{{img-id}}/g, imageObj.imageId)
			.replace('{{img-album}}', imageObj.album)
			.replace('{{img-tags}}', imageObj.tags)
			.replace('{{img-title}}', imageObj.title)
			.replace('{{img-likes}}', imageObj.likes);
	}

	m.likePic = function(imageId) {
		$.ajax({
			type: "GET",
			url: "/api/" + getToken() + "/" + imageId + "/like",
			success: function(data, textStatus, jqXHR) {

				if (data.error) return console.log(data.error);

				if (data.success) {
					$('[data-imageId=' + imageId + ']').find('.likes').text(data.likes);
				}
			}
		});
	}

	function getRandomPics(callback) {
		$.ajax({
			type: "GET",
			url: "/api/random/pictures?limit=4",
			success: function(data, textStatus, jqXHR) {
				callback(data, textStatus, jqXHR);
			}
		});
	}

	function getUserInfo(callback) {
		$.ajax({
			type: "GET",
			url: "/api/" + getToken() + "/userInfo",
			success: function(data, textStatus, jqXHR) {
				callback(data, textStatus, jqXHR);
			}
		});
	}

	function upload() {
		var formData = new FormData();
		var token = getToken();
		var tags = $("#tags").val();
		var title = $("#title").val();
		var imageFile = $("#imageInput")[0].files[0];
		formData.append('image', imageFile);
		formData.append('tags', tags);
		formData.append('title', title);

		$.ajax({
			type: "POST",
			url: "./api/" + token + "/image",
			data: formData,
			cache: false,
			contentType: false,
			processData: false,
			success: function(data, textStatus, jqXHR) {
				if (data.success) {
					alert('Картинка успешно загружена!');
				}
			}
		});
	}

	function loginLogout(e) {
		if (isAuthorized()) {
			logout();
			e.preventDefault();
		}
	}

	$(function() {

		$('#loginBtn').on('click', login);
		$('#registerBtn').on('click', register);
		$('#restoreBtn').on('click', restore);
		$('#uploadBtn').on('click', upload);
		$('#login-logout-btn').on('click', loginLogout);

		console.log('Is Authorized: ' + isAuthorized());

		$("#imageInput").on('change', function() {
			var size = this.files[0].size;
			if (size < 1024) {
				size += " байт";
			}
			else if (size < 1024 * 1024) {
				size = (size / 1024).toFixed(2) + " КБ";
			}
			else if (size < 1024 * 1024 * 1024) {
				size = (size / (1024 * 1024)).toFixed(2) + " МБ";
			}

			var name = this.files[0].name;

			if (name.length > 50) {
				name = name.substr(0, 24) + " - " + name.substr(name.length - 24, 24);
			}

			$(this).parents('.input-group').find(':text').val(name + " | " + size);
		});

		$('#splash').fadeOut(500);
	});

})(memster);

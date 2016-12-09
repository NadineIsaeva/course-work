const path = require('path');
const bodyParser = require('body-parser');
const express = require('express');
const passwordHash = require('password-hash');
const uuid = require('uuid');
const multer = require('multer');
const mongodb = require('mongodb');
const mongoClient = require('mongodb').MongoClient;

var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'data/images');
  },
  filename: function(req, file, cb) {
    cb(null, uuid.v1() + '.' + file.originalname.split('.')[1]);
  }
});

var upload = multer({
  storage: storage
});
const app = express();
var db = null;
var users = null;
var usersData = null;
var images = null;
var albums = null;

app.set('port', process.env.PORT || 8080);
app.set('host', process.env.IP || "0.0.0.0");
app.use(bodyParser.json());
app.use(express.static(path.resolve(__dirname, 'frontend')));
app.use('/images', express.static(path.resolve(__dirname, 'data/images')));

app.get('/api', (req, res) => {
  res.send('Hello =) It\'s memster REST API');
});

function generateSecret() {
  return [0, 0, 0, 0].map(() => Math.floor(Math.random() * 100));
}

app.post('/api/register', (req, res) => {
  let login = req.body.login;
  let name = req.body.name;
  let password = req.body.password;

  if (name === undefined || password === undefined || login === undefined) {
    res.send({
      'error': 'Can\'t find required fields'
    });
    return;
  }

  users.find({
    'login': login
  }).count((err, usersWithSameName) => {

    if (err) return console.log(err);

    if (usersWithSameName > 0) {
      res.send({
        'error': 'User with same login already exists'
      });
      return;
    }

    let passHash = passwordHash.generate(password);
    let token = uuid();
    let secret = generateSecret();

    let userObj = {
      'login': login,
      'password': passHash,
      'token': token,
      'secret': secret,
      'role': (login !== 'admin') ? 'user' : 'admin'
    };

    users.save(userObj, (err, result) => {

      if (err) return console.log(err);

      console.log('New user created: ' + JSON.stringify(userObj));

      let userInfoObj = {
        'login': login,
        'name': name,
        'avatar': null,
        'liked': []
      };

      usersData.save(userInfoObj, (err, result) => {

        if (err) return console.log(err);

        console.log('New userInfo created: ' + JSON.stringify(userInfoObj));

        res.send({
          'success': true,
          'name': name,
          'secret': secret,
          'token': token
        });
      });
    });
  });
});

app.post('/api/login', (req, res) => {
  let login = req.body.login;
  let password = req.body.password;

  if (login === undefined || password === undefined) {
    res.send({
      'error': 'Can\'t find required fields'
    });
    return;
  }

  users.find({
    'login': login
  }).limit(1).next((err, userObj) => {
    if (err) return console.log(err);

    if (userObj === null) {
      res.send({
        'error': 'Can\'t find any users with given login'
      });
      return;
    }

    if (!passwordHash.verify(password, userObj.password)) {
      res.send({
        'error': 'Wrong password'
      });
      return;
    }

    usersData.find({
      'login': login
    }).limit(1).next((err, userInfoObj) => {

      if (err) return console.log(err);

      if (userInfoObj === null) {
        console.log('Can\'t find userInfo for ' + login);
      }

      console.log('Someone logged: ' + JSON.stringify(userObj));

      res.send({
        'success': true,
        'userInfo': userInfoObj,
        'token': userObj.token
      });
    });
  });
});

app.post('/api/restore', (req, res) => {
  let login = req.body.login;
  let secret = req.body.secret;
  let newPass = req.body.password;

  if (login === undefined || secret === undefined || newPass === undefined) {
    res.send({
      'error': 'Can\'t find required fields'
    });
    return;
  }

  let passHash = passwordHash.generate(newPass);

  let newUserObj = {
    'password': passHash,
    'token': uuid(),
    'secret': generateSecret()
  };

  users.find({
    'login': login
  }).limit(1).next((err, userObj) => {

    if (err) return console.log(err);

    if (userObj === null) {

      res.send({
        'error': 'Can\'t find any users with given name/secret'
      });


    }
    else if ("" + secret !== "" + userObj.secret) {

      res.send({
        'error': 'Wrong secret'
      });

    }
    else {

      userObj.secret = newUserObj.secret;
      userObj.password = newUserObj.password;
      userObj.token = newUserObj.token;

      users.save(userObj, (err, result) => {

        if (err) return console.log(err);

        console.log('Someone restored password: ' + JSON.stringify(userObj));

        res.send({
          'success': true,
          'secret': userObj.secret
        });

      });

    }

  });

});

app.get('/api/:token/userInfo', (req, res) => {

  let token = req.param('token');

  users.find({
    'token': token
  }).limit(1).next((err, userObj) => {

    if (err) return console.log(err);

    if (userObj === null) {
      res.send({
        'error': 'Can\'t find any users with given token'
      });
      return;
    }

    usersData.find({
      'login': userObj.login
    }).limit(1).next((err, userInfoObj) => {

      if (err) return console.log(err);

      if (userInfoObj === null) {
        res.send({
          'error': 'Can\'t find userInfo; model is broken'
        });
        return;
      }

      res.send({
        'success': true,
        name: userInfoObj.name,
        avatar: userInfoObj.avatar,
        liked: userInfoObj.liked
      });
    });
  });
});

app.post('/api/:token/image', (req, res) => {

  let token = req.param('token');

  users.find({
    'token': token
  }).limit(1).next((err, userObj) => {
    if (err) return console.log(err);

    if (userObj === null) {
      res.send({
        'error': 'Can\'t find any users with given login'
      });
      return;
    }

    console.log('user: ', userObj);

    upload.single('image')(req, res, (err) => {
      if (err) return console.log(err);

      console.log('file: ', req.file);
      console.log('body: ', req.body);

      let tags = req.body.tags;
      let title = req.body.title;

      let imageObj = {
        'filename': req.file.filename,
        'owner': userObj.login,
        'title': title,
        'likes': 0,
        'album': null,
        'tags': tags
      }

      images.save(imageObj, (err, result) => {

        if (err) return console.log(err);

        console.log('New imageObj created: ' + JSON.stringify(imageObj));

        res.send({
          'success': true,
          'title': title,
          'filename': imageObj.filename,
          'imageId': imageObj._id,
          'tags': imageObj.tags
        });
      });
    })
  });
});

app.post('/api/:token/album', (req, res) => {

  let token = req.param('token');
  let title = req.body.title;

  users.find({
    'token': token
  }).limit(1).next((err, userObj) => {
    if (err) return console.log(err);

    if (userObj === null) {
      res.send({
        'error': 'Can\'t find any users with given login'
      });
      return;
    }

    let tags = req.body.tags;
    let title = req.body.title;

    let albumObj = {
      'owner': userObj.login,
      'title': title,
      'cover': null,
      'tags': tags
    }

    albums.save(albumObj, (err, result) => {

      if (err) return console.log(err);

      console.log('New albumObj created: ' + JSON.stringify(albumObj));

      res.send({
        'success': true,
        'title': title,
        'albumId': albumObj._id,
        'tags': albumObj.tags
      });
    });
  });
});

app.get('/api/:token/:imageId/like', (req, res) => {

  let token = req.param('token');
  let imageId = req.param('imageId');

  users.find({
    'token': token
  }).limit(1).next((err, userObj) => {

    if (err) return console.log(err);

    if (userObj === null) {
      res.send({
        'error': 'Can\'t find any users with given token'
      });
      return;
    }

    try {
      var imageMongoId = new mongodb.ObjectID(imageId);
    }
    catch (exception) {
      res.send({
        'error': 'Wrong imageId'
      });
      return console.log(exception);
    }

    images.find({
      '_id': imageMongoId
    }).limit(1).next((err, imageObj) => {

      if (err) return console.log(err);

      if (imageObj === null) {
        res.send({
          'error': 'Can\'t find any image with given id'
        });
        return;
      }

      usersData.find({
        'login': userObj.login
      }).limit(1).next((err, userInfoObj) => {

        if (err) return console.log(err);

        if (userInfoObj === null) {
          res.send({
            'error': 'Can\'t find userInfo; model is broken'
          });
          return;
        }

        let indexOfLike = userInfoObj.liked.indexOf(imageId);

        if (indexOfLike > -1) {
          userInfoObj.liked.splice(indexOfLike, 1);
          imageObj.likes--;
        }
        else {
          userInfoObj.liked.push(imageId);
          imageObj.likes++;
        }

        usersData.save(userInfoObj, (err, result) => {

          if (err) return console.log(err);


          images.save(imageObj, (err, result) => {

            if (err) return console.log(err);

            console.log('User ' + userObj.login + ' liked/dislike picture ' + imageId);

            res.send({
              'success': true,
              'likes': imageObj.likes,
              'liked': userInfoObj.liked
            });
          });
        });
      });
    });
  });
});

app.get('/api/:token/:imageId/delete', (req, res) => {

  let token = req.param('token');
  let imageId = req.param('imageId');

  users.find({
    'token': token
  }).limit(1).next((err, userObj) => {

    if (err) return console.log(err);

    if (userObj === null) {
      res.send({
        'error': 'Can\'t find any users with given token'
      });
      return;
    }

    images.find({
      '_id': imageId
    }).limit(1).next((err, imageObj) => {

      if (err) return console.log(err);

      if (imageObj === null) {
        res.send({
          'error': 'Can\'t find any image with given id'
        });
        return;
      }

      if (imageObj.owner !== userObj.login || userObj.role !== 'admin') {
        res.send({
          'error': 'Permission denied'
        });
        return;
      }

      images.deleteOne({
        '_id': imageId
      }, (err, result) => {

        if (err) return console.log(err);

        console.log('User ' + userObj.login + ' removed picture ' + imageId);

        res.send({
          'success': true
        });
      });
    });
  });
});

app.post('/api/:token/:imageId', (req, res) => {

  let token = req.param('token');
  let imageId = req.param('imageId');
  let updateInfo = req.body.updateInfo;

  users.find({
    'token': token
  }).limit(1).next((err, userObj) => {

    if (err) return console.log(err);

    if (userObj === null) {
      res.send({
        'error': 'Can\'t find any users with given token'
      });
      return;
    }

    images.find({
      '_id': imageId
    }).limit(1).next((err, imageObj) => {

      if (err) return console.log(err);

      if (imageObj === null) {
        res.send({
          'error': 'Can\'t find any image with given id'
        });
        return;
      }

      usersData.find({
        'login': userObj.login
      }).limit(1).next((err, userInfoObj) => {

        if (err) return console.log(err);

        imageObj.album = updateInfo.album || imageObj.album;
        imageObj.title = updateInfo.title || imageObj.title;
        imageObj.tags = updateInfo.tags || imageObj.tags;

        images.save(imageObj, (err, result) => {

          if (err) return console.log(err);

          console.log('User ' + userObj.login + ' updated picture ' + imageId + ' info ' + updateInfo);

          res.send({
            'success': true,
            'title': imageObj.title,
            'album': imageObj.album,
            'tags': imageObj.tags
          });
        });
      });
    });
  });
});

app.get('/api/:token/images', (req, res) => {

  let token = req.param('token');

  users.find({
    'token': token
  }).limit(0).next((err, userObj) => {

    if (err) return console.log(err);

    if (userObj === null) {
      res.send({
        'error': 'Can\'t find any users with given login'
      });
      return;
    }

    images.find({
      'owner': userObj.login
    }).toArray((err, imgs) => {
      if (err) return console.log(err);

      res.send({
        'success': true,
        'images': imgs.map((i) => new {
          'imageId': i._id,
          'title': i.title,
          'filename': i.filename,
          'owner': i.owner,
          'likes': i.likes,
          'album': i.album,
          'tags': i.tags
        })
      });
    });
  });
});

app.get('/api/random/pictures', (req, res) => {

  let limit = req.query.limit || 10;

  images.find().limit(limit * 10).toArray((err, imgs) => {
    if (err) return console.log(err);

    let randomPics = [];

    if (limit >= imgs.length) {
      imgs.forEach((e) => randomPics.push(e));
    }
    else {
      let i = 0;
      while (i < limit) {
        let pic = imgs[Math.floor(Math.random() * imgs.length)];

        if (randomPics.indexOf(pic) > -1) {
          continue;
        }

        randomPics.push(pic);
        i++;
      }
    }

    res.send({
      'success': true,
      'images': randomPics.map((i) => {
        return {
          'imageId': i._id,
          'title': i.title,
          'filename': i.filename,
          'owner': i.owner,
          'likes': i.likes,
          'album': i.album,
          'tags': i.tags
        };
      })
    });
  });
});

app.get('/queries', (req, res) => {

  db.collection('queries').find().toArray((err, result) => {
    if (err) return console.log(err);
    res.send(result);
  });

});

mongoClient.connect('mongodb://localhost:27017/memsterdb', (err, database) => {

  if (err) return console.log(err);

  db = database;
  users = db.collection('users');
  usersData = db.collection('usersData');
  images = db.collection('images');
  albums = db.collection('albums');

  console.log("Memster database connected");

  app.listen(app.get("port"), app.get("host"), () => {
    console.log("Memster server listening at", app.get("host") + ":" + app.get("port"));
  });

});

////////////////////////////////////////////////////////////////////////////////
//                                  (memster)                                 //
//                                                      I7                    //
//                                                      I7                    //
//      I7:II+  +II~     =III    7I ~II~ ,II~    :II7  7II7   ~III    77:I    //
//      III?7I7I??77I  +I7  77   7III?II77?III  77  77 ?I7I  II  II   7II?    //
//      I7   7I    7I  7I7777    7I,   I7   7I   77     I7  II7777    7I      //
//      I7   77    7I  77    ,,  7I    I7   7I     77   I7  II    ,,  7I      //
//      I7   7I    7I  =IIIIII7  7I    I7   7I  777II7  I7  ,II7I777  77      //
//      ==   ==    ==     ==~    ==    ==   ==    ==    ==     ===    ==      //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                      Created by Nadya Isaeva (c) 2016                      //
//                                                                            //
//                           , ,=?777777777?:                                 //
//                          I7777777777777777777? ,                           //
//                       +7777777777777777777777777~                          //
//                     +77777777777777777777777777777,,                       //
//                   ,777777777777777777777777777777777                       //
//                  ~77777777777777777777777777777777777,                     //
//                 ?77777777777777777777777777777777?,?II                     //
//                7777777777777777777+ ?77::77777777~~                        //
//               7777777777777777777: ~    7 777777?I     ?                   //
//              +7777777777777777777 7     = 7777777 7=  7 7                  //
//              77777777777777777777+=     7 77777777?  ,7I7=                 //
//             7777777777777777777777? 77? ~7777   7777777777                 //
//            ~777777777777777777777777777777777=  77=?777777~                //
//            77777777777777777777777777777777=77?,,: 77777777                //
//           :777777777777777777777777777777777=:7777777777777                //
//           7777777777777777777777777777777777777777777777777?               //
//           77777777777777777777777777777777777777777777777777               //
//          :77777777777777777777777777777777777777777777777777               //
//          ?77777777777777777777777777777777777777777777777777:              //
//          777777777777777777777777777777777777777777777777777?              //
//          7777777777777777777777777777777777777777777777777777              //
//          7777777777777777777777777777777777777777777777777777              //
//         =7777777777777777777777777777777777777777777777777777              //
//         +7777777777777777777777777777777777777777777777777777~             //
//        ,I77777777777777777777777777777777777777777777777777777             //
//         7777777777777777777777I7777777777777777777777777777777             //
//         777777777777777777777,  7777777777777777777777777777777            //
//        =7777777777777777777777  =77777777777777777777777777777I            //
//        I7777777777777777777777,  7777777777777777777777777777777           //
//        777777777777777777777777 ,+7777777777777777777777777777777          //
//        7777777777777777777~       77777777777777777777777777777777         //
//      ,=77777777777777777777777777I,,7777777777777=       +777777777        //
//       I+7777777777777777777777777777~,      ~7 =7IIIIIII7 7777777777       //
//             ~777777777777777777777777+IIIIIIII IIIIIIIIII7+777777777       //
//                ,7777777777777777777777:IIIIIIII 7IIIIIII7I 777777777=      //
//                  , I777777777777777777,IIIIIIII7 IIIIIIIII7 77777777       //
//                        =7777777777777+?I7 ,I7=,77,IIIIIIIIII? ,+I?, ,      //
//                              ~I777?  I,?IIII7 7:77:IIIIIIIIIIII777II+      //
//                                   7  77777II7I7,7I?=IIIIIII7I7II?+II++     //
//                                     7777777+==7II7I=?I7I=                  //
//                                      ?7IIII7=,                             //
//                                       7I~                                  //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////


//
// Dependencies
//

const path = require('path');
const bodyParser = require('body-parser');
const express = require('express');
const passwordHash = require('password-hash');
const uuid = require('uuid');
const multer = require('multer');
const mongodb = require('mongodb');
const mongoClient = require('mongodb').MongoClient;

//
// Variables
//

const app = express();
let db = null;
let users = null;
let usersData = null;
let images = null;
let albums = null;

//
// Images storages
//

let imageStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'data/images');
  },
  filename: function(req, file, cb) {
    cb(null, uuid.v1() + '.' + file.originalname.split('.')[1]);
  }
});

let uploadImage = multer({
  storage: imageStorage
});

let avatarStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'data/avatars');
  },
  filename: function(req, file, cb) {
    cb(null, uuid.v1() + '.' + file.originalname.split('.')[1]);
  }
});

let uploadAvatar = multer({
  storage: avatarStorage
});

//
// Configuration
//

app.set('port', process.env.PORT || 8080);
app.set('host', process.env.IP || "0.0.0.0");
app.use(bodyParser.json());
app.use(express.static(path.resolve(__dirname, 'frontend')));
app.use('/images', express.static(path.resolve(__dirname, 'data/images')));
app.use('/avatars', express.static(path.resolve(__dirname, 'data/avatars')));



//////////////////////////////////////////////
//             R E S T   A P I              //
//////////////////////////////////////////////

//
// User functions
//

let generateSecret = () => [0, 0, 0, 0].map(() => Math.floor(Math.random() * 100));

// Create new user
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
        'owner': login,
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

// Login
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

// Restore password
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

// Read user's info
app.get('/api/:login/userInfo', (req, res) => {

  let login = req.params.login;

  usersData.find({
    'owner': login
  }).limit(1).next((err, userInfoObj) => {

    if (err) return console.log(err);

    if (userInfoObj === null) {
      res.send({
        'error': 'Can\'t find userInfo for given login'
      });
      return;
    }

    res.send({
      'success': true,
      'name': userInfoObj.name,
      'avatar': userInfoObj.avatar,
      'liked': userInfoObj.liked
    });
  });
});

// Update user's info
app.post('/api/:token/userInfo', (req, res) => {

  let token = req.params.token;
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

    usersData.find({
      'owner': userObj.login
    }).limit(1).next((err, userInfoObj) => {

      if (err) return console.log(err);

      if (userInfoObj === null) {
        res.send({
          'error': 'Can\'t find userInfo; model is broken'
        });
        return;
      }

      userInfoObj.avatar = updateInfo.avatar || userInfoObj.avatar;
      userInfoObj.name = updateInfo.name || userInfoObj.name;

      res.send({
        'success': true,
        'name': userInfoObj.name,
        'avatar': userInfoObj.avatar
      });
    });
  });
});

// Upload avatar
app.post('/api/:token/avatar', (req, res) => {

  let token = req.params.token;

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
      'owner': userObj.login
    }).limit(1).next((err, userInfoObj) => {

      if (err) return console.log(err);

      if (userInfoObj === null) {
        res.send({
          'error': 'Can\'t find userInfo; model is broken'
        });
        return;
      }

      uploadAvatar.single('avatar')(req, res, (err) => {

        if (err) return console.log(err);

        userInfoObj.avatar = req.file.filename;

        usersData.save(userInfoObj, (err, result) => {

          if (err) return console.log(err);

          console.log('New avatar for ' + userObj.login + ' uploaded ' + userInfoObj.avatar);

          res.send({
            'success': true,
            'avatar': userInfoObj.avatar,
          });
        });
      });
    });
  })
});


//
// Images functions
//

// Create image (upload)
app.post('/api/:token/image', (req, res) => {

  let token = req.params.token;
  let title = req.body.title;
  let tags = req.body.tags;
  let albumId = null || req.body.albumId;

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

    uploadImage.single('image')(req, res, (err) => {
      if (err) return console.log(err);

      let imageObj = {
        'filename': req.file.filename,
        'owner': userObj.login,
        'title': title,
        'likes': 0,
        'album': albumId,
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
          'albumId': albumId,
          'tags': imageObj.tags
        });
      });
    })
  });
});

// Read image
app.get('/api/image/:imageId', (req, res) => {

  let imageId = req.params.imageId;

  try {
    var imageIdMongo = new mongodb.ObjectID(imageId);
  }
  catch (exception) {
    res.send({
      'error': 'Wrong imageId'
    });
    return console.log(exception);
  }

  images.find({
    '_id': imageIdMongo
  }).limit(1).next((err, imageObj) => {

    if (err) return console.log(err);

    if (imageObj === null) {
      res.send({
        'error': 'Can\'t find any image with given id'
      });
      return;
    }

    res.send({
      'success': true,
      'image': {
        'imageId': imageObj._id,
        'title': imageObj.title,
        'filename': imageObj.filename,
        'owner': imageObj.owner,
        'likes': imageObj.likes,
        'album': imageObj.album,
        'tags': imageObj.tags
      }
    });
  });
});

// Update image
app.post('/api/:token/image/:imageId', (req, res) => {

  let token = req.params.token;
  let imageId = req.params.imageId;
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

    try {
      var imageIdMongo = new mongodb.ObjectID(imageId);
    }
    catch (exception) {
      res.send({
        'error': 'Wrong imageId'
      });
      return console.log(exception);
    }

    images.find({
      '_id': imageIdMongo
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

// Delete image
app.get('/api/:token/image/:imageId/delete', (req, res) => {

  let token = req.params.token;
  let imageId = req.params.imageId;

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
      var imageIdMongo = new mongodb.ObjectID(imageId);
    }
    catch (exception) {
      res.send({
        'error': 'Wrong imageId'
      });
      return console.log(exception);
    }

    images.find({
      '_id': imageIdMongo
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
        '_id': imageIdMongo
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

// Get all images (associated with concrete user)
app.get('/api/:login/images', (req, res) => {

  let login = req.params.login;

  users.find({
    'login': login
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
        'images': imgs.map((i) => ({
          'imageId': i._id,
          'title': i.title,
          'filename': i.filename,
          'owner': i.owner,
          'likes': i.likes,
          'album': i.album,
          'tags': i.tags
        }))
      });
    });
  });
});


//
// Album functions
//

// Create album
app.post('/api/:token/album', (req, res) => {

  let token = req.params.token;
  let tags = req.body.tags;
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
        'cover': null,
        'tags': albumObj.tags
      });
    });
  });
});

// Read album (with associated images)
app.get('/api/album/:albumId', (req, res) => {

  let albumId = req.params.albumId;

  try {
    var albumIdMongo = new mongodb.ObjectID(albumId);
  }
  catch (exception) {
    res.send({
      'error': 'Wrong imageId'
    });
    return console.log(exception);
  }

  albums.find({
    '_id': albumIdMongo
  }).limit(1).next((err, albumObj) => {

    if (err) return console.log(err);

    if (albumObj === null) {
      res.send({
        'error': 'Can\'t find any image with given id'
      });
      return;
    }

    images.find({
      'album': albumId
    }).toArray((err, imgs) => {
      if (err) return console.log(err);

      res.send({
        'success': true,
        'title': albumObj.title,
        'cover': albumObj.cover,
        'tags': albumObj.tags,
        'images': imgs.map((i) => ({
          'imageId': i._id,
          'title': i.title,
          'filename': i.filename,
          'owner': i.owner,
          'likes': i.likes,
          'album': i.album,
          'tags': i.tags
        }))
      });
    });
  });
});

// Update album
app.post('/api/:token/album/:albumId', (req, res) => {

  let token = req.params.token;
  let albumId = req.params.albumId;
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

    try {
      var albumIdMongo = new mongodb.ObjectID(albumId);
    }
    catch (exception) {
      res.send({
        'error': 'Wrong imageId'
      });
      return console.log(exception);
    }

    albums.find({
      '_id': albumIdMongo
    }).limit(1).next((err, albumObj) => {

      if (err) return console.log(err);

      if (albumObj === null) {
        res.send({
          'error': 'Can\'t find any image with given id'
        });
        return;
      }

      usersData.find({
        'login': userObj.login
      }).limit(1).next((err, userInfoObj) => {

        if (err) return console.log(err);

        albumObj.album = updateInfo.cover || albumObj.cover;
        albumObj.title = updateInfo.title || albumObj.title;
        albumObj.tags = updateInfo.tags || albumObj.tags;

        albums.save(albumObj, (err, result) => {

          if (err) return console.log(err);

          console.log('User ' + userObj.login + ' updated album ' + albumId + ' info ' + updateInfo);

          res.send({
            'success': true,
            'title': albumObj.title,
            'cover': albumObj.cover,
            'tags': albumObj.tags
          });
        });
      });
    });
  });
});

// Delete album
app.get('/api/:token/album/:albumId/delete', (req, res) => {

  let token = req.params.token;
  let albumId = req.params.albumId;

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
      var albumIdMongo = new mongodb.ObjectID(albumId);
    }
    catch (exception) {
      res.send({
        'error': 'Wrong albumId'
      });
      return console.log(exception);
    }

    albums.find({
      '_id': albumIdMongo
    }).limit(1).next((err, albumObj) => {

      if (err) return console.log(err);

      if (albumObj === null) {
        res.send({
          'error': 'Can\'t find any image with given id'
        });
        return;
      }

      if (albumObj.owner !== userObj.login || userObj.role !== 'admin') {
        res.send({
          'error': 'Permission denied'
        });
        return;
      }

      albums.deleteOne({
        '_id': albumIdMongo
      }, (err, result) => {

        if (err) return console.log(err);

        images.deleteMany({
          'album': albumId
        }, (err, result) => {

          if (err) return console.log(err);

          console.log('User ' + userObj.login + ' removed album ' + albumId);

          res.send({
            'success': true
          });
        });
      });
    });
  });
});

// Get all albums (associated with concrete user)
app.get('/api/:login/albums', (req, res) => {

  let login = req.params.login;

  users.find({
    'login': login
  }).limit(0).next((err, userObj) => {

    if (err) return console.log(err);

    if (userObj === null) {
      res.send({
        'error': 'Can\'t find any users with given login'
      });
      return;
    }

    albums.find({
      'owner': userObj.login
    }).toArray((err, albms) => {
      if (err) return console.log(err);

      res.send({
        'success': true,
        'albms': albms.map((a) => ({
          'albumId': a._id,
          'title': a.title,
          'cover': a.cover,
          'owner': a.owner,
          'tags': a.tags
        }))
      });
    });
  });
});


//
// Utils
//

// Get random pic
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

// Get random album
app.get('/api/random/albums', (req, res) => {

  let limit = req.query.limit || 10;

  albums.find().limit(limit * 10).toArray((err, imgs) => {
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
      'albums': randomPics.map((a) => {
        return {
          'albumId': a._id,
          'owner': a.owner,
          'title': a.title,
          'cover': a.cover,
          'tags': a.tags
        };
      })
    });
  });
});

// Like image
app.get('/api/:token/image/:imageId/like', (req, res) => {

  let token = req.params.token;
  let imageId = req.params.imageId;

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
      var imageIdMongo = new mongodb.ObjectID(imageId);
    }
    catch (exception) {
      res.send({
        'error': 'Wrong imageId'
      });
      return console.log(exception);
    }

    images.find({
      '_id': imageIdMongo
    }).limit(1).next((err, imageObj) => {

      if (err) return console.log(err);

      if (imageObj === null) {
        res.send({
          'error': 'Can\'t find any image with given id'
        });
        return;
      }

      usersData.find({
        'owner': userObj.login
      }).limit(1).next((err, userInfoObj) => {

        if (err) return console.log(err);

        if (userInfoObj === null) {
          res.send({
            'error': 'Can\'t find userInfo; model is broken'
          });
          return;
        }

        let indexOfLike = userInfoObj.liked.indexOf(imageId);

        let action = 'liked';

        if (indexOfLike > -1) {
          userInfoObj.liked.splice(indexOfLike, 1);
          imageObj.likes--;
          action = 'unliked';
        }
        else {
          userInfoObj.liked.push(imageId);
          imageObj.likes++;
        }

        usersData.save(userInfoObj, (err, result) => {

          if (err) return console.log(err);


          images.save(imageObj, (err, result) => {

            if (err) return console.log(err);

            console.log('User ' + userObj.login + ' ' + action + ' picture ' + imageId);

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

// Get count of album likes
app.get('/api/album/:albumId/likes', (req, res) => {

  let albumId = req.params.albumId;

  images.find({
    'album': albumId
  }).toArray((err, imgs) => {
    if (err) return console.log(err);

    res.send({
      'success': true,
      'likes': imgs.reduce((a, b) => a.likes + b.likes)
    });
  });
});

// Get count of user likes
app.get('/api/:login/likes', (req, res) => {

  let login = req.params.login;

  images.find({
    'owner': login
  }).toArray((err, imgs) => {
    if (err) return console.log(err);

    res.send({
      'success': true,
      'likes': imgs.reduce((a, b) => a.likes + b.likes)
    });
  });
});

// Search
app.get('/api/search', (req, res) => {

  let searchQuery = req.body.searchQuery;

  if (searchQuery[0] === '@') { // search by login

    usersData.find({
      'owner': {
        '$regex': searchQuery.substr(1)
      }
    }).toArray((err, usrs) => {

      if (err) return console.log(err);

      res.send({
        'success': true,
        'searchQuery': searchQuery,
        'results': usrs.length,
        'users': usrs.map((u) => ({
          'login': u.owner,
          'name': u.name,
          'avatar': u.avatar,
          'liked': u.liked
        }))
      });

    });

  }
  else if (searchQuery[0] === '#') { // search by tag

    images.find({
      'tags': {
        '$regex': searchQuery.substr(1)
      }
    }).toArray((err, imgs) => {

      if (err) return console.log(err);

      albums.find({
        'tags': {
          '$regex': searchQuery.substr(1)
        }
      }).toArray((err, albms) => {

        if (err) return console.log(err);

        res.send({
          'success': true,
          'searchQuery': searchQuery,
          'results': imgs.length + albms.length,
          'images': imgs.map((i) => ({
            'imageId': i._id,
            'title': i.title,
            'filename': i.filename,
            'owner': i.owner,
            'likes': i.likes,
            'album': i.album,
            'tags': i.tags
          })),
          'albums': albms.map((a) => ({
            'albumId': a._id,
            'title': a.title,
            'cover': a.cover,
            'owner': a.owner,
            'tags': a.tags
          }))
        });
      });
    });

  }
  else { // search by titles
    images.find({
      'title': {
        '$regex': searchQuery.substr(1)
      }
    }).toArray((err, imgs) => {

      if (err) return console.log(err);

      albums.find({
        'title': {
          '$regex': searchQuery.substr(1)
        }
      }).toArray((err, albms) => {

        if (err) return console.log(err);

        res.send({
          'success': true,
          'searchQuery': searchQuery,
          'results': imgs.length + albms.length,
          'images': imgs.map((i) => ({
            'imageId': i._id,
            'title': i.title,
            'filename': i.filename,
            'owner': i.owner,
            'likes': i.likes,
            'album': i.album,
            'tags': i.tags
          })),
          'albums': albms.map((a) => ({
            'albumId': a._id,
            'title': a.title,
            'cover': a.cover,
            'owner': a.owner,
            'tags': a.tags
          }))
        });
      });
    });

  }

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

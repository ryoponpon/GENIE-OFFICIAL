const express = require('express');
const app =express();
const http = require('http');
const server = new http.Server(app);
const io = require('socket.io')(server);
const fs = require('fs');
const mysql = require('mysql');
const session = require('express-session');
const paginate = require('express-paginate');
const bcrypt = require('bcryptjs');
const PORT = process.env.PORT || 3000;



app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));


app.get('/script.js', (req, res) => {
  res.setHeader('Content-Type', 'text/javascript');
  res.sendFile(__dirname + '/views/script.js');
});

const connection = mysql.createConnection({
  host: 'process.env.DB_HOST',
  user: 'process.env.DB_USER',
  password: 'process.env.DB_PASSWORD',	
  database: 'process.env.DB_DATABASE',
});



app.use(
  session({
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
  })
);

//ログイン状態
app.use((req, res, next) => {
  if(req.session.userId === undefined){
    res.locals.username = 'ゲスト';
    res.locals.isLoggedIn = false;
  } else {
    res.locals.username = req.session.username;
    res.locals.isLoggedIn = true;
    console.log('ログイン成功');
    console.log('ログインユーザー名:', req.session.username); 
  }
  next();
});


//socket 
io.on('connection', (secket) => {
  console.log('socket接続成功');
});

//トップ

app.get('/', (req, res) => {
  res.render('top.ejs');
});

//施術紹介
app.get('/int', (req, res) => {
  res.render('int.ejs');
});

//developper---記事投稿ページ
app.get('/developper', (req, res) => {
  res.render('developper.ejs');
});

app.post('/developper',
  (req, res, next) => {
    console.log('入力欄の空チェック');
    const { title, content, category} = req.body;
    const errors = [];
    console.log('受け取ったカテゴリー:', category);

    if (title === '') {
      errors.push('タイトルを入力してください');
    }
    if (content === '') {
      errors.push('内容を入力してください');
      console.log('コンテンツ');
    }
    if(category === undefined){
      errors.push('カテゴリーを選択してください');
      console.log('カテゴリー');
    }


    if (errors.length > 0) {
      res.render('developper.ejs', { errors: errors });
    } else {
      // エラーがない場合は次のミドルウェアに進む
      next();
    }
  },
  (req, res) => {
    console.log('記事投稿');
    const { title, content, category} = req.body;
    connection.query(
      'INSERT INTO articles (title, content, category) VALUES (?, ?, ?)',
      [title, content, category],
      (error, results) => {
        if (error) {
          console.error('記事の投稿に失敗しました:', error);
          res.send('記事の投稿に失敗しました');
        } else {
          console.log('記事の投稿が成功しました');
          res.redirect('/');
        }
      }  
    );
  }
);


//ブログ

app.get('/blog', paginate.middleware(10, 50), (req, res) => {
  const page = req.query.page || 1; // クエリパラメーターからページ番号を取得、デフォルトは1

  // 逆順で記事を取得するクエリ
  connection.query('SELECT * FROM articles ORDER BY created_at DESC', (error, results, fields) => {
    if (error) {
      console.error('Error fetching data: ' + error.stack);
      return;
    }

    // 日付の一部を取得し、resultsに新しいプロパティとして追加する
    results.forEach((row) => {
      const createDate = row.created_at; // 仮に列名がcreated_atとする
      const day = createDate.getDate();
      const month = createDate.getMonth() + 1;
      const year = createDate.getFullYear();
      row.formattedDate = `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
    });

    const itemCount = results.length; // 全アイテム数
    const pageCount = Math.ceil(itemCount / req.query.limit); // 全ページ数
    const paginatedResults = results.slice(req.skip, req.skip + req.query.limit); // ページごとの結果


    // EJSテンプレートにデータを渡す
    res.render('blog.ejs', {
      articles: paginatedResults,
      pageCount,
      itemCount,
      pages: paginate.getArrayPages(req)(3, pageCount, page),
      currentPage: page
    });
  });
});

app.delete('/article/delete/:id', (req, res) => {
  const id = req.params.id;
  connection.query(
      'DELETE FROM articles WHERE id = ?',
      [id],
      (error, results) => {
        if(error){
          console.error('記事の削除に失敗しました', error);
          res.sendStatus(500);
        } else { 
          console.log('記事の削除に成功しました');
          res.sendStatus(200);
        }
      }
  );
});

app.get('/article/edit/:id',(req, res) => {
  const id = req.params.id;
  connection.query(
    'SELECT * FROM articles WHERE id = ?',
    [id],
    (error, results) => {
      if(error){
        console.error('Error fetching data: ' + error.stack);
        return;
      }
      res.render('edit.ejs', {article: results[0]});
    }
  );
});

app.post('/article/update/:id', (req, res, next) => {
  // 入力のバリデーション
  const { title, content, category} = req.body;
  const errors = [];

  if (errors.length > 0) {
    res.render('edit.ejs', { errors: errors });
  } else {
    const id = req.params.id;
    const title = req.body.title;
    const content = req.body.content;
    const category = req.body.category;

    connection.query(
      'UPDATE articles SET title = ?, content = ?, category = ? WHERE id = ?',
      [title, content, category, id],
      (error, results) => {
        if (error) {
          console.error('記事の投稿に失敗しました:', error);
          res.send('記事の投稿に失敗しました');
        } else {
          console.log('記事の投稿が成功しました');
          
          // 更新された記事データを再取得してedit.ejsに渡す
          connection.query(
            'SELECT * FROM articles WHERE id = ?',
            [id],
            (error, results) => {
              if (error) {
                console.error('記事の投稿に失敗しました:', error);
                res.send('記事の投稿に失敗しました');
              } else {
                console.log('記事の投稿が成功しました');
                res.redirect('/blog');
              }
            }
          );
        }
      }
    );
  }
});



//記事（article.ejs）
app.get('/article/:id', (req, res) => {
  const id = req.params.id;
  connection.query(
    'SELECT * FROM articles WHERE id = ?',
    [id],
    (error, results) =>{
      if (error) {
        console.error('Error fetching data: ' + error.stack);
        return;
      }

      results.forEach((row) => {
        const createDate = row.created_at; // 仮に列名がcreated_atとする
        const day = createDate.getDate();
        const month = createDate.getMonth() + 1;
        const year = createDate.getFullYear();
        row.formattedDate = `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
      });
    
      res.render('article.ejs', {article: results[0]});
      
    }
  );
});




//新規登録

app.get('/signup', (req, res) => {
  res.render('signup.ejs', {errors: []});
});

app.post('/signup', 
  (req, res, next) => {
    console.log('入力値の空チェック');
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const errors = [];

    if (username === '') {
      errors.push('ユーザー名が空です');
    }

    if (email === '') {
      errors.push('メールアドレスが空です');
    }

    if (password === '') {
      errors.push('パスワードが空です');
    }

    if (errors.length > 0) {
      res.render('signup.ejs', { errors: errors });
    } else {
      next();
    }
  },
  (req, res, next) => {
    console.log('メールアドレスの重複チェック');
    const email = req.body.email;
    const errors = [];
    connection.query(
      'SELECT * FROM users WHERE email = ?',
      [email],
      (error, results) => {
        if (results.length > 0) {
          errors.push('ユーザー登録に失敗しました');
          res.render('signup.ejs', { errors: errors });
        } else {
          next();
        }
      }
    );
  },
  (req, res) => {
    console.log('ユーザー登録');
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    bcrypt.hash(password, 10, (error, hash) => {
      connection.query(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hash],
        (error, results) => {
          req.session.userId = results.insertId;
          req.session.username = username;
          res.redirect('/');
        }
      );
    });
  }
);


//ログイン

app.get('/login', (req, res) => {
  res.render('login.ejs', { errors: [] });
});

app.post('/login', (req, res) => {
  const email = req.body.email;
  connection.query(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (error, results) => {
      const errors = []; // エラーメッセージを格納する配列

      if (results.length > 0) {
        const plain = req.body.password;
        const hash = results[0].password;

        bcrypt.compare(plain, hash, (error, isEqual) => {
          if (isEqual) {
            req.session.userId = results[0].user_id;
            req.session.username = results[0].username;
            if (email === 'ryopon.kr@gmail.com' && plain === 'ryopon1207') {
              return res.redirect('/developper');
            } else {
              return res.redirect('/');
            }
          } else {
            errors.push('パスワードが違います');
            res.render('login.ejs', { errors });
          }
        });
      } else {
        errors.push('メールアドレスが違います');
        res.render('login.ejs', { errors });
      }
    }
  );
});




//ログアウト
app.get('/logout', (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error('Error destroying session:', error);
      res.status(500).send('Logout failed');
    } else {
      res.redirect('/');
    }
  });
});

//退会

app.get('/remone-account', (req, res) => {
  res.render('remoneAccount.ejs');
});

app.post('/remove-account', (req, res) => {
  const userId = req.session.userId;
  const { username, email, password } = req.body;
  const errors = [];

  connection.query('SELECT * FROM users WHERE user_id = ?', [userId], (error, results) => {
    if (error) {
      console.error('Error retrieving user data:', error);
      res.send('Error retrieving user data');
    } else {
      if (results.length === 1) {
        const user = results[0];

        if (username !== user.username) {
          errors.push('無効なユーザーネームです');
        }
        if (email !== user.email) {
          errors.push('無効なメールアドレスです');
        }
        if (!bcrypt.compareSync(password, user.password)) {
          errors.push('無効なパスワードです');
        }

        if (errors.length > 0) {
          console.error('認証エラー', errors);
          res.render('removeAccount.ejs', { errors });
        } else {
          connection.query('DELETE FROM users WHERE user_id = ?', [userId], (deleteError, deleteResults) => {
            if (deleteError) {
              console.error('アカウントの退会に失敗しました:', deleteError);
              res.send('アカウントの退会に失敗しました');
            } else {
              console.log('アカウント削除成功');
              req.session.destroy(); // セッションを破棄
              res.redirect('/login'); // 退会後にリダイレクト
            }
          });
        }
      } else {
        res.send('ユーザーが見つかりません');
      }
    }
  });
});

// ポート指定
server.listen(process.env.PORT || 3000, () => {
  console.log('Server is running');
});

import express from 'express';
import session from 'express-session';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(session({
  secret: 'supersecreto',
  resave: false,
  saveUninitialized: false
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${timestamp}${ext}`);
  }
});
const upload = multer({ storage });

const usersPath = path.join(__dirname, 'users.json');

function loadUsers() {
  if (!fs.existsSync(usersPath)) return [];
  const raw = fs.readFileSync(usersPath);
  return JSON.parse(raw);
}

function authRequired(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/login');
}

app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    req.session.user = username;
    return res.redirect('/upload');
  }
  res.render('login', { error: 'Credenciais inválidas' });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.get('/upload', authRequired, (req, res) => {
  res.render('upload', { user: req.session.user });
});

app.post('/upload', authRequired, upload.single('image'), async (req, res) => {
  const file = req.file;
  const ext = path.extname(file.originalname).toLowerCase();
  const inputPath = path.join(__dirname, 'uploads', file.filename);
  let finalFilename = file.filename;

  const convertToJpeg = ['.jfif', '.webp', '.bmp', '.tiff', '.svg'];

  try {
    if (convertToJpeg.includes(ext)) {
      const nameWithoutExt = path.basename(file.filename, ext);
      finalFilename = `${nameWithoutExt}-${Date.now()}.jpeg`;
      const outputPath = path.join(__dirname, 'uploads', finalFilename);

      await sharp(inputPath).jpeg({ quality: 90 }).toFile(outputPath);

      // Deleta o arquivo original após 10s
      setTimeout(async () => {
        try {
          await fs.promises.access(inputPath);
          await fs.promises.unlink(inputPath);
          console.log(`Arquivo ${inputPath} removido após 10s`);
        } catch (err) {
          console.error(`Erro ao remover após 10s: ${err.message}`);
        }
      }, 10000);
    }

    // Verifica se o arquivo convertido realmente existe
    const finalPath = path.join(__dirname, 'uploads', finalFilename);
    await fs.promises.access(finalPath);

    // Salva no JSON
    const imagePath = `/uploads/${finalFilename}`;
    const uploadedBy = req.session.user;

    const imagesPath = path.join(__dirname, 'images.json');
    let images = [];

    if (fs.existsSync(imagesPath)) {
      images = JSON.parse(fs.readFileSync(imagesPath));
    }

    images.push({ url: imagePath, uploadedBy });
    fs.writeFileSync(imagesPath, JSON.stringify(images, null, 2));

    res.redirect('/gallery');
  } catch (err) {
    console.error("Erro ao processar imagem:", err);
    res.status(500).send("Erro ao processar imagem.");
  }
});

app.get('/gallery', (req, res) => {
  const uploadsDir = path.join(__dirname, 'uploads');
  const imagesFile = path.join(__dirname, 'images.json');

  const files = fs.existsSync(uploadsDir)
    ? fs.readdirSync(uploadsDir).filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
    : [];

  let imageData = [];
  if (fs.existsSync(imagesFile)) {
    imageData = JSON.parse(fs.readFileSync(imagesFile));
  }

  const images = files.map(file => {
    const found = imageData.find(img => img.url.endsWith(file));
    return {
      url: `/uploads/${file}`,
      uploadedBy: found?.uploadedBy || 'Desconhecido'
    };
  });

  res.render('gallery', { images });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando: http://localhost:${PORT}`));

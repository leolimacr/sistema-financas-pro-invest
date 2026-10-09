const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const admin = require('firebase-admin');

// 1. Inicializa o Firebase Admin usando a chave que você baixou e renomeou
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// 2. Define onde estão as suas pastas de notícias (ajuste se for diferente)
// Aqui estamos assumindo que seus arquivos .md vão ficar em src/content/news
const CONTENT_DIR = path.join(__dirname, '../src/content/news');

async function uploadNews() {
  console.log('Iniciando o envio de notícias para o Firestore...');

  // Verifica se a pasta existe
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error(`A pasta ${CONTENT_DIR} não existe. Por favor, crie-a.`);
    return;
  }

  // Lê as subpastas (criptomoedas, acoes-b3, etc)
  const categories = fs.readdirSync(CONTENT_DIR);

  for (const category of categories) {
    const categoryPath = path.join(CONTENT_DIR, category);
    
    // Pula se não for uma pasta
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    // Lê os arquivos .md dentro da categoria
    const files = fs.readdirSync(categoryPath).filter(fn => fn.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      // gray-matter separa o cabeçalho (data) do texto (content)
      const { data, content } = matter(fileContent);

      // Usamos o nome do arquivo (sem o .md) como ID do documento no Firebase
      const docId = file.replace('.md', '');

      const newsData = {
        ...data,
        content: content,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      try {
        await db.collection('noticias').doc(docId).set(newsData);
        console.log(`✅ Sucesso: Notícia '${docId}' enviada/atualizada.`);
      } catch (error) {
        console.error(`❌ Erro ao enviar '${docId}':`, error);
      }
    }
  }
  
  console.log('🎉 Processo de upload finalizado!');
}

uploadNews();

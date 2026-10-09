import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
// Ajustado para importar 'firestore' e referenciar o arquivo firebase.ts
import { firestore } from '../firebase'; 

export const getLatestNews = async (numberOfNews = 9) => {
  try {
    const newsRef = collection(firestore, 'noticias');
    // Ordena da mais recente para a mais antiga e limita o número de notícias
    const q = query(newsRef, orderBy('date', 'desc'), limit(numberOfNews));
    
    const querySnapshot = await getDocs(q);
    const news: any[] = [];
    
    querySnapshot.forEach((doc) => {
      // Adiciona o id do documento junto com os dados (titulo, resumo, etc)
      news.push({ id: doc.id, ...doc.data() });
    });
    
    return news;
  } catch (error) {
    console.error("Erro ao buscar notícias:", error);
    return [];
  }
};

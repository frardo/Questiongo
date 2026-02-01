import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, Auth, signInWithPopup, onAuthStateChanged, signOut, User, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, Timestamp, doc, updateDoc, deleteDoc, getDoc, where, setDoc, limit, Firestore, onSnapshot } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Lazy loading - só inicializa quando realmente necessário (no cliente)
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;
let _googleProvider: GoogleAuthProvider | null = null;
let _appleProvider: OAuthProvider | null = null;

function getApp(): FirebaseApp {
  if (!_app) {
    if (getApps().length > 0) {
      _app = getApps()[0];
    } else {
      _app = initializeApp(firebaseConfig);
    }
  }
  return _app;
}

// Auth real (sem Proxy) para garantir persistência e compatibilidade com Firebase SDK
export function getAuthInstance(): Auth {
  if (!_auth) {
    _auth = getAuth(getApp());
    // Garantir persistência local (sobrevive a fechar/reabrir navegador)
    setPersistence(_auth, browserLocalPersistence).catch((err) =>
      console.error("Erro ao configurar persistência:", err)
    );
  }
  return _auth;
}

// Proxy que delega para instância real - com bind correto para métodos
export const auth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    const realAuth = getAuthInstance();
    const value = (realAuth as any)[prop];
    if (typeof value === 'function') {
      return value.bind(realAuth);
    }
    return value;
  }
});

// Função que retorna instância real do Firestore (não Proxy)
// Firebase SDK não reconhece Proxies como instâncias válidas
export function getDb(): Firestore {
  if (!_db) _db = getFirestore(getApp());
  return _db;
}

// Alias para compatibilidade (deprecated - usar getDb() em funções)
export const db = {
  get instance() {
    return getDb();
  }
};

export const storage: FirebaseStorage = new Proxy({} as FirebaseStorage, {
  get(_, prop) {
    if (!_storage) _storage = getStorage(getApp());
    return (_storage as any)[prop];
  }
});

export const googleProvider: GoogleAuthProvider = new Proxy({} as GoogleAuthProvider, {
  get(_, prop) {
    if (!_googleProvider) _googleProvider = new GoogleAuthProvider();
    return (_googleProvider as any)[prop];
  }
});

export const appleProvider: OAuthProvider = new Proxy({} as OAuthProvider, {
  get(_, prop) {
    if (!_appleProvider) _appleProvider = new OAuthProvider('apple.com');
    return (_appleProvider as any)[prop];
  }
});

export const loginWithEmail = (email: string, password: string) => {
  return signInWithEmailAndPassword(getAuthInstance(), email, password);
};

export const registerWithEmail = (email: string, password: string) => {
  return createUserWithEmailAndPassword(getAuthInstance(), email, password);
};

// Login com Google
export const loginWithGoogle = () => {
  if (!_googleProvider) _googleProvider = new GoogleAuthProvider();
  return signInWithPopup(getAuthInstance(), _googleProvider);
};

// Login com Apple
export const loginWithApple = () => {
  if (!_appleProvider) _appleProvider = new OAuthProvider('apple.com');
  return signInWithPopup(getAuthInstance(), _appleProvider);
};

// Logout
export const logout = () => {
  return signOut(getAuthInstance());
};

// Observer de autenticação
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(getAuthInstance(), callback);
};

// Atualizar foto de perfil do usuário
export const atualizarFotoPerfil = async (photoURL: string) => {
  const user = getAuthInstance().currentUser;
  if (!user) throw new Error('Usuário não autenticado');
  await updateProfile(user, { photoURL });
};

// Função para upload de arquivos via Cloudinary
export const uploadArquivo = async (arquivo: File, pasta: string = 'perguntas'): Promise<string> => {
  // Validar tamanho (max 10MB)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (arquivo.size > MAX_SIZE) {
    throw new Error('Arquivo muito grande. Máximo permitido: 10MB.');
  }

  // Validar tipo de arquivo
  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  if (!tiposPermitidos.includes(arquivo.type)) {
    throw new Error('Tipo de arquivo não permitido. Use: JPG, PNG, GIF, WEBP ou PDF.');
  }

  try {
    const formData = new FormData();
    formData.append('file', arquivo);
    formData.append('pasta', pasta);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro no upload');
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Erro no upload:', error);
    throw error instanceof Error ? error : new Error('Erro desconhecido no upload.');
  }
};

// Função para upload de múltiplos arquivos
export const uploadArquivos = async (arquivos: File[], pasta: string = 'perguntas'): Promise<string[]> => {
  const urls = await Promise.all(arquivos.map(arquivo => uploadArquivo(arquivo, pasta)));
  return urls;
};

// Tipos
export interface Pergunta {
  id?: string;
  materia: string;
  pergunta: string;
  valor: number;

  criadoEm: Timestamp;
  usuarioId: string;
  usuarioNome: string;
  usuarioFoto?: string;
  arquivos?: string[];
  status: 'aberta' | 'respondida' | 'fechada';
  nivel?: 'fundamental' | 'medio' | 'superior';
  // Dados da resposta (preenchido quando status = 'respondida')
  respondedorNome?: string;
  respondedorFoto?: string;
  respostaVerificada?: boolean;
}

// Funções de Perguntas
export const criarPergunta = async (pergunta: Omit<Pergunta, 'id' | 'criadoEm'>) => {
  const docRef = await addDoc(collection(getDb(), 'perguntas'), {
    ...pergunta,
    criadoEm: Timestamp.now(),
  });

  // Incrementar atividade do usuário para o ranking (não bloqueia se falhar)
  try {
    await incrementarAtividade(
      pergunta.usuarioId,
      pergunta.usuarioNome,
      pergunta.usuarioFoto
    );
  } catch (error) {
    console.error("Erro ao incrementar atividade (não crítico):", error);
  }

  return docRef.id;
};

export const buscarPerguntas = async (): Promise<Pergunta[]> => {
  const q = query(collection(getDb(), 'perguntas'), orderBy('criadoEm', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Pergunta));
};

// Buscar perguntas com dados da resposta (para o feed/mercado)
export const buscarPerguntasComRespostas = async (): Promise<Pergunta[]> => {
  // Buscar todas as perguntas
  const perguntasQuery = query(collection(getDb(), 'perguntas'), orderBy('criadoEm', 'desc'));
  const perguntasSnapshot = await getDocs(perguntasQuery);
  const perguntas = perguntasSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Pergunta));

  // Buscar todas as respostas
  const respostasQuery = query(collection(getDb(), 'respostas'));
  const respostasSnapshot = await getDocs(respostasQuery);
  const respostasMap = new Map<string, Resposta>();
  respostasSnapshot.docs.forEach(doc => {
    const resposta = { id: doc.id, ...doc.data() } as Resposta;
    respostasMap.set(resposta.perguntaId, resposta);
  });

  // Enriquecer perguntas com dados da resposta
  return perguntas.map(pergunta => {
    if (pergunta.status === 'respondida' && pergunta.id) {
      const resposta = respostasMap.get(pergunta.id);
      if (resposta) {
        return {
          ...pergunta,
          respondedorNome: resposta.usuarioNome,
          respondedorFoto: resposta.usuarioFoto,
          respostaVerificada: resposta.verificada,
        };
      }
    }
    return pergunta;
  });
};

// Listener em tempo real para perguntas com dados de respostas (usa onSnapshot)
export const ouvirPerguntasComRespostas = (
  callback: (perguntas: Pergunta[]) => void
): (() => void) => {
  const perguntasQuery = query(collection(getDb(), 'perguntas'), orderBy('criadoEm', 'desc'));

  const unsubscribe = onSnapshot(perguntasQuery, async (perguntasSnapshot) => {
    const perguntas = perguntasSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Pergunta));

    // Buscar respostas para enriquecer
    try {
      const respostasQuery = query(collection(getDb(), 'respostas'));
      const respostasSnapshot = await getDocs(respostasQuery);
      const respostasMap = new Map<string, Resposta>();
      respostasSnapshot.docs.forEach(doc => {
        const resposta = { id: doc.id, ...doc.data() } as Resposta;
        respostasMap.set(resposta.perguntaId, resposta);
      });

      const perguntasEnriquecidas = perguntas.map(pergunta => {
        if (pergunta.status === 'respondida' && pergunta.id) {
          const resposta = respostasMap.get(pergunta.id);
          if (resposta) {
            return {
              ...pergunta,
              respondedorNome: resposta.usuarioNome,
              respondedorFoto: resposta.usuarioFoto,
              respostaVerificada: resposta.verificada,
            };
          }
        }
        return pergunta;
      });

      callback(perguntasEnriquecidas);
    } catch (error) {
      console.error("Erro ao enriquecer perguntas com respostas:", error);
      callback(perguntas);
    }
  });

  return unsubscribe;
};

export const atualizarPergunta = async (id: string, dados: Partial<Pergunta>) => {
  const docRef = doc(getDb(), 'perguntas', id);
  await updateDoc(docRef, dados);
};

export const deletarPergunta = async (id: string) => {
  const docRef = doc(getDb(), 'perguntas', id);
  await deleteDoc(docRef);
};

export const buscarPerguntaPorId = async (id: string): Promise<Pergunta | null> => {
  const docRef = doc(getDb(), 'perguntas', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Pergunta;
  }
  return null;
};

export const buscarPerguntasPorMateria = async (materia: string, excluirId?: string, limite: number = 4): Promise<Pergunta[]> => {
  try {
    // Query simples sem índice composto
    const q = query(
      collection(getDb(), 'perguntas'),
      where('materia', '==', materia),
      limit(20) // Buscar mais para filtrar depois
    );
    const querySnapshot = await getDocs(q);
    let perguntas = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Pergunta));

    // Filtrar por status aberta e excluir a pergunta atual
    perguntas = perguntas.filter(p => {
      const statusAberta = p.status === 'aberta' || !p.status;
      const naoEhAtual = excluirId ? p.id !== excluirId : true;
      return statusAberta && naoEhAtual;
    });

    // Ordenar por data (mais recentes primeiro)
    perguntas.sort((a, b) => {
      const dataA = a.criadoEm?.toDate?.() || new Date(0);
      const dataB = b.criadoEm?.toDate?.() || new Date(0);
      return dataB.getTime() - dataA.getTime();
    });

    return perguntas.slice(0, limite);
  } catch (error) {
    console.error('Erro ao buscar perguntas por matéria:', error);
    return [];
  }
};

export const buscarPerguntasPorUsuario = async (usuarioId: string): Promise<Pergunta[]> => {
  try {
    const q = query(
      collection(getDb(), 'perguntas'),
      where('usuarioId', '==', usuarioId),
      orderBy('criadoEm', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Pergunta));
  } catch (error) {
    console.error("Erro na consulta com índice, tentando sem ordenação:", error);
    // Fallback: buscar sem ordenação se o índice não existir
    const q = query(
      collection(getDb(), 'perguntas'),
      where('usuarioId', '==', usuarioId)
    );
    const querySnapshot = await getDocs(q);
    const perguntas = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Pergunta));
    // Ordenar no cliente
    return perguntas.sort((a, b) => b.criadoEm.toMillis() - a.criadoEm.toMillis());
  }
};

// Tipos de Resposta
export interface Resposta {
  id?: string;
  perguntaId: string;
  resposta: string;
  explicacao: string;
  arquivos?: string[];
  criadoEm: Timestamp;
  usuarioId: string;
  usuarioNome: string;
  usuarioFoto?: string;
  status: 'pendente' | 'aceita' | 'rejeitada';
  // Dados da pergunta (para exibição)
  perguntaMateria?: string;
  perguntaTexto?: string;
  perguntaValor?: number;
  // Campos de verificação por IA
  verificada?: boolean;           // true se Gemini aprovou
  verificadaEm?: Timestamp;       // quando foi verificada
  confiancaIA?: number;           // 0-100% confiança da IA
  denuncias?: number;             // contador de denúncias
  analisadaPorIA?: boolean;       // se já passou por análise de spam
}

// Funções de Respostas
export const criarResposta = async (resposta: Omit<Resposta, 'id' | 'criadoEm'>) => {
  // Criar resposta com campos de verificação iniciais
  const docRef = await addDoc(collection(getDb(), 'respostas'), {
    ...resposta,
    criadoEm: Timestamp.now(),
    denuncias: 0,
    analisadaPorIA: false,
  });

  // Atualizar status da pergunta para 'respondida'
  await atualizarPergunta(resposta.perguntaId, { status: 'respondida' });

  // Incrementar atividade do usuário para o ranking (não bloqueia se falhar)
  try {
    await incrementarAtividade(
      resposta.usuarioId,
      resposta.usuarioNome,
      resposta.usuarioFoto
    );
  } catch (error) {
    console.error("Erro ao incrementar atividade (não crítico):", error);
  }

  return docRef.id;
};

// Atualizar resultado da verificação por IA (chamado pelo cliente)
export const atualizarVerificacaoResposta = async (
  respostaId: string,
  verificada: boolean,
  confianca: number
) => {
  const docRef = doc(getDb(), 'respostas', respostaId);
  await updateDoc(docRef, {
    verificada,
    verificadaEm: Timestamp.now(),
    confiancaIA: confianca,
  });
};

export const buscarVerificacaoPorPerguntaIds = async (perguntaIds: string[]): Promise<Map<string, boolean>> => {
  const resultado = new Map<string, boolean>();
  if (perguntaIds.length === 0) return resultado;

  // Firestore 'in' query suporta até 30 valores por vez
  const chunks = [];
  for (let i = 0; i < perguntaIds.length; i += 30) {
    chunks.push(perguntaIds.slice(i, i + 30));
  }

  for (const chunk of chunks) {
    const q = query(
      collection(getDb(), 'respostas'),
      where('perguntaId', 'in', chunk)
    );
    const snapshot = await getDocs(q);
    snapshot.docs.forEach(doc => {
      const data = doc.data() as Resposta;
      if (data.verificada !== undefined) {
        resultado.set(data.perguntaId, data.verificada === true);
      }
    });
  }

  return resultado;
};

export const buscarRespostas = async (): Promise<Resposta[]> => {
  const q = query(collection(getDb(), 'respostas'), orderBy('criadoEm', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Resposta));
};

export const buscarRespostasPorUsuario = async (usuarioId: string): Promise<Resposta[]> => {
  try {
    const q = query(
      collection(getDb(), 'respostas'),
      where('usuarioId', '==', usuarioId),
      orderBy('criadoEm', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Resposta));
  } catch (error) {
    console.error("Erro na consulta com índice, tentando sem ordenação:", error);
    const q = query(
      collection(getDb(), 'respostas'),
      where('usuarioId', '==', usuarioId)
    );
    const querySnapshot = await getDocs(q);
    const respostas = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Resposta));
    return respostas.sort((a, b) => b.criadoEm.toMillis() - a.criadoEm.toMillis());
  }
};

// Buscar notificações (respostas às perguntas do usuário)
export interface Notificacao {
  id: string;
  tipo: 'resposta_recebida';
  perguntaId: string;
  perguntaTexto: string;
  respostaId: string;
  // respostaTexto REMOVIDO por segurança - não enviar texto da resposta nas notificações
  respondedorNome: string;
  respondedorFoto?: string;
  valor: number;
  criadoEm: Timestamp;
  lida: boolean;
}

export const buscarNotificacoes = async (usuarioId: string): Promise<Notificacao[]> => {
  try {
    // Buscar perguntas do usuário
    const perguntasQuery = query(
      collection(getDb(), 'perguntas'),
      where('usuarioId', '==', usuarioId)
    );
    const perguntasSnapshot = await getDocs(perguntasQuery);

    const notificacoes: Notificacao[] = [];

    // Para cada pergunta, buscar respostas
    for (const perguntaDoc of perguntasSnapshot.docs) {
      const pergunta = perguntaDoc.data() as Pergunta;

      const respostasQuery = query(
        collection(getDb(), 'respostas'),
        where('perguntaId', '==', perguntaDoc.id)
      );
      const respostasSnapshot = await getDocs(respostasQuery);

      for (const respostaDoc of respostasSnapshot.docs) {
        const resposta = respostaDoc.data() as Resposta;

        notificacoes.push({
          id: respostaDoc.id,
          tipo: 'resposta_recebida',
          perguntaId: perguntaDoc.id,
          perguntaTexto: pergunta.pergunta,
          respostaId: respostaDoc.id,
          // respostaTexto removido por segurança
          respondedorNome: resposta.usuarioNome,
          respondedorFoto: resposta.usuarioFoto,
          valor: pergunta.valor,
          criadoEm: resposta.criadoEm,
          lida: resposta.status !== 'pendente', // Considera lida se já foi aceita/rejeitada
        });
      }
    }

    // Ordenar por data (mais recentes primeiro)
    return notificacoes.sort((a, b) => b.criadoEm.toMillis() - a.criadoEm.toMillis());
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    return [];
  }
};

export const buscarRespostaPorPerguntaId = async (perguntaId: string): Promise<Resposta | null> => {
  const q = query(
    collection(getDb(), 'respostas'),
    where('perguntaId', '==', perguntaId)
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.docs.length > 0) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Resposta;
  }
  return null;
};

export const atualizarResposta = async (id: string, dados: Partial<Resposta>) => {
  const docRef = doc(getDb(), 'respostas', id);
  await updateDoc(docRef, dados);
};

export const deletarResposta = async (id: string) => {
  const docRef = doc(getDb(), 'respostas', id);
  await deleteDoc(docRef);
};

// Denunciar resposta (incrementa contador e analisa spam se >= 3 denúncias)
export const denunciarResposta = async (respostaId: string): Promise<{
  excluida: boolean;
  denuncias: number;
  motivo?: string;
}> => {
  const docRef = doc(getDb(), 'respostas', respostaId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return { excluida: false, denuncias: 0, motivo: "Resposta não encontrada" };
  }

  const dados = docSnap.data() as Resposta;
  const novasDenuncias = (dados.denuncias || 0) + 1;

  // Atualizar contador de denúncias
  await updateDoc(docRef, { denuncias: novasDenuncias });

  // Se atingiu 3 denúncias e ainda não foi analisada por IA
  if (novasDenuncias >= 3 && !dados.analisadaPorIA) {
    try {
      const response = await fetch('/api/analisar-spam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pergunta: dados.perguntaTexto || '',
          resposta: dados.resposta,
        }),
      });

      if (response.ok) {
        const resultado = await response.json();

        if (resultado.spam === true) {
          // Excluir resposta se for spam
          await deleteDoc(docRef);
          return {
            excluida: true,
            denuncias: novasDenuncias,
            motivo: resultado.motivo || "Conteúdo identificado como spam",
          };
        } else {
          // Marcar que já foi analisada (não analisar novamente)
          await updateDoc(docRef, { analisadaPorIA: true });
        }
      }
    } catch (error) {
      console.error("Erro ao analisar spam:", error);
      // Em caso de erro, apenas marca como analisada para não tentar de novo
      await updateDoc(docRef, { analisadaPorIA: true });
    }
  }

  return { excluida: false, denuncias: novasDenuncias };
};

// Tipos de Pergunta Salva
export interface PerguntaSalva {
  id?: string;
  usuarioId: string;
  perguntaId: string;
  salvoEm: Timestamp;
}

// Funções de Perguntas Salvas
export const salvarPergunta = async (usuarioId: string, perguntaId: string) => {
  // Verifica se já está salva
  const q = query(
    collection(getDb(), 'perguntasSalvas'),
    where('usuarioId', '==', usuarioId),
    where('perguntaId', '==', perguntaId)
  );
  const querySnapshot = await getDocs(q);

  if (querySnapshot.docs.length > 0) {
    // Já está salva, não faz nada
    return querySnapshot.docs[0].id;
  }

  const docRef = await addDoc(collection(getDb(), 'perguntasSalvas'), {
    usuarioId,
    perguntaId,
    salvoEm: Timestamp.now(),
  });
  return docRef.id;
};

export const removerPerguntaSalva = async (usuarioId: string, perguntaId: string) => {
  const q = query(
    collection(getDb(), 'perguntasSalvas'),
    where('usuarioId', '==', usuarioId),
    where('perguntaId', '==', perguntaId)
  );
  const querySnapshot = await getDocs(q);

  for (const docSnap of querySnapshot.docs) {
    await deleteDoc(doc(getDb(), 'perguntasSalvas', docSnap.id));
  }
};

export const buscarPerguntasSalvas = async (usuarioId: string): Promise<Pergunta[]> => {
  try {
    // Busca os IDs das perguntas salvas pelo usuário
    const q = query(
      collection(getDb(), 'perguntasSalvas'),
      where('usuarioId', '==', usuarioId),
      orderBy('salvoEm', 'desc')
    );
    const querySnapshot = await getDocs(q);

    // Busca os dados completos de cada pergunta
    const perguntas: Pergunta[] = [];
    for (const docSnap of querySnapshot.docs) {
      const perguntaId = docSnap.data().perguntaId;
      const pergunta = await buscarPerguntaPorId(perguntaId);
      if (pergunta) {
        perguntas.push(pergunta);
      }
    }

    return perguntas;
  } catch (error) {
    console.error("Erro na consulta com índice, tentando sem ordenação:", error);
    // Fallback: buscar sem ordenação
    const q = query(
      collection(getDb(), 'perguntasSalvas'),
      where('usuarioId', '==', usuarioId)
    );
    const querySnapshot = await getDocs(q);

    const perguntas: Pergunta[] = [];
    for (const docSnap of querySnapshot.docs) {
      const perguntaId = docSnap.data().perguntaId;
      const pergunta = await buscarPerguntaPorId(perguntaId);
      if (pergunta) {
        perguntas.push(pergunta);
      }
    }

    return perguntas;
  }
};

export const verificarPerguntaSalva = async (usuarioId: string, perguntaId: string): Promise<boolean> => {
  const q = query(
    collection(getDb(), 'perguntasSalvas'),
    where('usuarioId', '==', usuarioId),
    where('perguntaId', '==', perguntaId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.length > 0;
};

// ==================== ESTATÍSTICAS E RANKING ====================

// Tipos de Estatísticas do Usuário
export interface UserStats {
  usuarioId: string;
  usuarioNome: string;
  usuarioFoto?: string;
  atividadesHoje: number;
  atividadesSemana: number;
  atividadesMes: number;
  atividadesTotal: number;
  ultimaAtividade: Timestamp;
  diaAtual: string;
  semanaAtual: number;
  mesAtual: string;
}

// Funções auxiliares para obter período atual
const obterDiaAtual = (): string => {
  return new Date().toISOString().split('T')[0]; // "2026-01-10"
};

const obterSemanaAtual = (): number => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
};

const obterMesAtual = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // "2026-01"
};

// Incrementar atividade do usuário
export const incrementarAtividade = async (
  usuarioId: string,
  usuarioNome: string,
  usuarioFoto?: string
) => {
  const docRef = doc(getDb(), 'userStats', usuarioId);
  const docSnap = await getDoc(docRef);

  const diaAtual = obterDiaAtual();
  const semanaAtual = obterSemanaAtual();
  const mesAtual = obterMesAtual();

  if (docSnap.exists()) {
    const dados = docSnap.data() as UserStats;

    // Verificar se precisa resetar contadores
    let novoHoje = dados.atividadesHoje;
    let novaSemana = dados.atividadesSemana;
    let novoMes = dados.atividadesMes;

    // Reset diário
    if (dados.diaAtual !== diaAtual) {
      novoHoje = 0;
    }

    // Reset semanal
    if (dados.semanaAtual !== semanaAtual) {
      novaSemana = 0;
    }

    // Reset mensal
    if (dados.mesAtual !== mesAtual) {
      novoMes = 0;
    }

    await updateDoc(docRef, {
      usuarioNome,
      usuarioFoto: usuarioFoto || dados.usuarioFoto,
      atividadesHoje: novoHoje + 1,
      atividadesSemana: novaSemana + 1,
      atividadesMes: novoMes + 1,
      atividadesTotal: dados.atividadesTotal + 1,
      ultimaAtividade: Timestamp.now(),
      diaAtual,
      semanaAtual,
      mesAtual,
    });
  } else {
    // Criar novo documento de stats
    await setDoc(docRef, {
      usuarioId,
      usuarioNome,
      usuarioFoto,
      atividadesHoje: 1,
      atividadesSemana: 1,
      atividadesMes: 1,
      atividadesTotal: 1,
      ultimaAtividade: Timestamp.now(),
      diaAtual,
      semanaAtual,
      mesAtual,
    });
  }
};

// Buscar ranking por período
export const buscarRanking = async (
  periodo: 'diario' | 'semanal' | 'mensal' | 'total',
  limite: number = 10
): Promise<UserStats[]> => {
  let campoOrdenacao: string;

  switch (periodo) {
    case 'diario':
      campoOrdenacao = 'atividadesHoje';
      break;
    case 'semanal':
      campoOrdenacao = 'atividadesSemana';
      break;
    case 'mensal':
      campoOrdenacao = 'atividadesMes';
      break;
    default:
      campoOrdenacao = 'atividadesTotal';
  }

  const q = query(
    collection(getDb(), 'userStats'),
    orderBy(campoOrdenacao, 'desc'),
    limit(limite)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as UserStats);
};

// Buscar estatísticas do usuário atual
export const buscarMinhasStats = async (usuarioId: string): Promise<{
  posicao: number;
  atividades: number;
  stats: UserStats | null;
}> => {
  const docRef = doc(getDb(), 'userStats', usuarioId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return { posicao: 0, atividades: 0, stats: null };
  }

  const minhasStats = docSnap.data() as UserStats;

  // Buscar posição no ranking (total)
  const q = query(
    collection(getDb(), 'userStats'),
    orderBy('atividadesTotal', 'desc')
  );
  const querySnapshot = await getDocs(q);

  let posicao = 0;
  querySnapshot.docs.forEach((doc, index) => {
    if (doc.id === usuarioId) {
      posicao = index + 1;
    }
  });

  return {
    posicao,
    atividades: minhasStats.atividadesTotal,
    stats: minhasStats,
  };
};

// ==================== SALDO E TRANSAÇÕES ====================

// Tipos de Saldo
export interface Saldo {
  usuarioId: string;
  usuarioNome: string;
  saldoDisponivel: number;
  totalGanho: number;
  totalSacado: number;
  ultimaAtualizacao: Timestamp;
}

// Tipos de Transação
export interface Transacao {
  id?: string;
  usuarioId: string;
  tipo: 'credito' | 'debito' | 'saque';
  valor: number;
  descricao: string;
  perguntaId?: string;
  respostaId?: string;
  status?: 'pendente' | 'concluido' | 'cancelado';
  criadoEm: Timestamp;
}

// Buscar saldo do usuário
export const buscarSaldo = async (usuarioId: string): Promise<Saldo | null> => {
  const docRef = doc(getDb(), 'saldos', usuarioId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as Saldo;
  }
  return null;
};

// Buscar transações do usuário
export const buscarTransacoes = async (usuarioId: string): Promise<Transacao[]> => {
  try {
    const q = query(
      collection(getDb(), 'transacoes'),
      where('usuarioId', '==', usuarioId),
      orderBy('criadoEm', 'desc'),
      limit(50)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Transacao));
  } catch (error) {
    console.error("Erro na consulta com índice, tentando sem ordenação:", error);
    const q = query(
      collection(getDb(), 'transacoes'),
      where('usuarioId', '==', usuarioId)
    );
    const querySnapshot = await getDocs(q);
    const transacoes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Transacao));
    return transacoes.sort((a, b) => b.criadoEm.toMillis() - a.criadoEm.toMillis()).slice(0, 50);
  }
};

// Calcular ganhos por período
export const calcularGanhosPorPeriodo = async (
  usuarioId: string,
  periodo: 'semana' | 'mes' | 'total'
): Promise<number> => {
  const transacoes = await buscarTransacoes(usuarioId);

  const agora = new Date();
  let dataLimite: Date;

  switch (periodo) {
    case 'semana':
      dataLimite = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'mes':
      dataLimite = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      dataLimite = new Date(0); // Desde sempre
  }

  return transacoes
    .filter(t => t.tipo === 'credito' && t.criadoEm.toDate() >= dataLimite)
    .reduce((total, t) => total + t.valor, 0);
};

// ==================== CHAVES PIX SALVAS ====================

// Tipos de Chave PIX Salva
export interface ChavePixSalva {
  id?: string;
  usuarioId: string;
  tipoChave: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';
  chave: string;
  apelido?: string;
  principal: boolean;
  criadoEm: Timestamp;
}

// Salvar nova chave PIX
export const salvarChavePix = async (dados: Omit<ChavePixSalva, 'id' | 'criadoEm'>): Promise<string> => {
  // Se for principal, desmarcar outras chaves
  if (dados.principal) {
    const chavesAtuais = await buscarChavesPix(dados.usuarioId);
    for (const chave of chavesAtuais) {
      if (chave.principal && chave.id) {
        await updateDoc(doc(getDb(), 'chavesPix', chave.id), { principal: false });
      }
    }
  }

  const docRef = await addDoc(collection(getDb(), 'chavesPix'), {
    ...dados,
    criadoEm: Timestamp.now(),
  });
  return docRef.id;
};

// Buscar chaves PIX do usuário
export const buscarChavesPix = async (usuarioId: string): Promise<ChavePixSalva[]> => {
  try {
    const q = query(
      collection(getDb(), 'chavesPix'),
      where('usuarioId', '==', usuarioId),
      orderBy('criadoEm', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ChavePixSalva));
  } catch (error) {
    console.error("Erro ao buscar chaves PIX:", error);
    // Fallback sem ordenação
    const q = query(
      collection(getDb(), 'chavesPix'),
      where('usuarioId', '==', usuarioId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ChavePixSalva));
  }
};

// Definir chave como principal
export const definirChavePrincipal = async (usuarioId: string, chaveId: string): Promise<void> => {
  // Desmarcar todas as outras
  const chaves = await buscarChavesPix(usuarioId);
  for (const chave of chaves) {
    if (chave.id && chave.id !== chaveId && chave.principal) {
      await updateDoc(doc(getDb(), 'chavesPix', chave.id), { principal: false });
    }
  }
  // Marcar a selecionada
  await updateDoc(doc(getDb(), 'chavesPix', chaveId), { principal: true });
};

// Remover chave PIX
export const removerChavePix = async (chaveId: string): Promise<void> => {
  await deleteDoc(doc(getDb(), 'chavesPix', chaveId));
};

// ==================== PREFERÊNCIAS DE GATEWAY ====================

// Tipos de Preferência de Gateway
export interface PreferenciaGateway {
  usuarioId: string;
  gateway: 'stripe' | 'abacatepay';
  atualizadoEm: Timestamp;
}

// Salvar preferência de gateway
export const salvarPreferenciaGateway = async (
  usuarioId: string,
  gateway: 'stripe' | 'abacatepay'
): Promise<void> => {
  const docRef = doc(getDb(), 'preferenciasGateway', usuarioId);
  await setDoc(docRef, {
    usuarioId,
    gateway,
    atualizadoEm: Timestamp.now(),
  });
};

// Buscar preferência de gateway
export const buscarPreferenciaGateway = async (
  usuarioId: string
): Promise<'stripe' | 'abacatepay' | null> => {
  const docRef = doc(getDb(), 'preferenciasGateway', usuarioId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const dados = docSnap.data() as PreferenciaGateway;
    return dados.gateway;
  }
  return null;
};

// ==================== CONTA BANCÁRIA PARA RECEBIMENTO ====================

// Tipos de Conta Bancária
export interface ContaBancaria {
  usuarioId: string;
  banco: string;
  bancoNome: string;
  agencia: string;
  conta: string;
  digito: string;
  tipoConta: 'corrente' | 'poupanca';
  titularNome: string;
  titularCpf: string;
  atualizadoEm: Timestamp;
}

// Salvar conta bancária
export const salvarContaBancaria = async (
  dados: Omit<ContaBancaria, 'atualizadoEm'>
): Promise<void> => {
  const docRef = doc(getDb(), 'contasBancarias', dados.usuarioId);
  await setDoc(docRef, {
    ...dados,
    atualizadoEm: Timestamp.now(),
  });
};

// Buscar conta bancária do usuário
export const buscarContaBancaria = async (
  usuarioId: string
): Promise<ContaBancaria | null> => {
  const docRef = doc(getDb(), 'contasBancarias', usuarioId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as ContaBancaria;
  }
  return null;
};

// Interface de Denúncia
export interface Denuncia {
  id?: string;
  perguntaId: string;
  denuncianteId: string;
  denuncianteNome: string;
  motivo?: string;
  status: 'pendente' | 'analisando' | 'resolvida' | 'rejeitada';
  criadoEm: Timestamp;
}

// Criar denúncia
export const criarDenuncia = async (denuncia: Omit<Denuncia, 'id' | 'criadoEm' | 'status'>) => {
  const docRef = await addDoc(collection(getDb(), 'denuncias'), {
    ...denuncia,
    status: 'pendente',
    criadoEm: Timestamp.now(),
  });
  return docRef.id;
};

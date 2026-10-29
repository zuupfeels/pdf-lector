import * as pdfjsLib from 'pdfjs-dist';
import { DocumentItem, ParagraphItem } from '../types';

// Set up worker for PDF.js safely using unpkg / cdnjs fallback
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
}

/**
 * Splits extracted text into natural paragraph chunks suitable for audio narration.
 * Keeps chunks between ~120 and ~450 characters so each sentence flows naturally
 * and buffering stays lightning-fast.
 */
export function chunkTextIntoParagraphs(rawText: string, pageNumber: number = 1, startingIndex: number = 0): ParagraphItem[] {
  // Normalize line breaks and clean common PDF hyphenation splits
  const normalized = rawText
    .replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2') // rejoin hyphenated words across lines
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Split on double newlines or punctuation groupings
  const rawBlocks = normalized.split(/\n\s*\n+/);
  const paragraphs: ParagraphItem[] = [];
  let currentIndex = startingIndex;

  for (const block of rawBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // If a block is too long (> 550 chars), subdivide it by sentence boundaries
    if (trimmed.length > 550) {
      const sentences = trimmed.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [trimmed];
      let currentBuffer = '';

      for (const sentence of sentences) {
        if ((currentBuffer + ' ' + sentence).trim().length > 400 && currentBuffer.trim().length > 80) {
          paragraphs.push({
            id: `p-${pageNumber}-${currentIndex}`,
            pageNumber,
            paragraphIndex: currentIndex,
            text: currentBuffer.trim(),
          });
          currentIndex++;
          currentBuffer = sentence;
        } else {
          currentBuffer = currentBuffer ? `${currentBuffer} ${sentence}` : sentence;
        }
      }

      if (currentBuffer.trim().length > 0) {
        paragraphs.push({
          id: `p-${pageNumber}-${currentIndex}`,
          pageNumber,
          paragraphIndex: currentIndex,
          text: currentBuffer.trim(),
        });
        currentIndex++;
      }
    } else if (trimmed.length > 5) {
      // Normal sized paragraph
      paragraphs.push({
        id: `p-${pageNumber}-${currentIndex}`,
        pageNumber,
        paragraphIndex: currentIndex,
        text: trimmed.replace(/\s+/g, ' '),
      });
      currentIndex++;
    }
  }

  return paragraphs;
}

/**
 * Parses a PDF file from an ArrayBuffer and produces a clean DocumentItem
 */
export async function parsePdfFile(
  file: File,
  onProgress?: (progress: { current: number; total: number; percent: number }) => void
): Promise<DocumentItem> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const allParagraphs: ParagraphItem[] = [];
  let fullRawText = '';

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Group text items by line
    let lastY: number | null = null;
    let pageText = '';

    for (const item of textContent.items as Array<{ str: string; transform: number[] }>) {
      if ('str' in item) {
        const currentY = item.transform ? item.transform[5] : null;
        if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 8) {
          pageText += '\n';
        } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
          pageText += ' ';
        }
        pageText += item.str;
        lastY = currentY;
      }
    }

    fullRawText += `\n\n--- Página ${pageNum} ---\n\n` + pageText;
    const pageParagraphs = chunkTextIntoParagraphs(pageText, pageNum, allParagraphs.length);
    allParagraphs.push(...pageParagraphs);

    if (onProgress) {
      onProgress({
        current: pageNum,
        total: numPages,
        percent: Math.round((pageNum / numPages) * 100),
      });
    }
  }

  if (allParagraphs.length === 0) {
    throw new Error(
      'No se encontró texto legible en el PDF. Si es un documento escaneado (fotocopia o imagen), debe contener una capa de texto digital (OCR) para poder ser leído en voz alta.'
    );
  }

  const title = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
  const sizeMb = file.size >= 1024 * 1024
    ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(file.size / 1024)} KB`;

  return {
    id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title,
    filename: file.name,
    fileSize: sizeMb,
    totalPages: numPages,
    totalParagraphs: allParagraphs.length,
    paragraphs: allParagraphs,
    currentParagraphIndex: 0,
    progressPercent: 0,
    dateAdded: 'Hoy',
    colorAccent: '#3b82f6',
    category: 'Documento PDF',
    summary: allParagraphs.slice(0, 2).map((p) => p.text).join(' '),
  };
}

/**
 * Creates a DocumentItem from plain text (e.g. pasted text or .txt file)
 */
export function parsePlainText(text: string, title: string = 'Texto pegado'): DocumentItem {
  const paragraphs = chunkTextIntoParagraphs(text, 1, 0);

  return {
    id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title,
    filename: `${title.toLowerCase().replace(/\s+/g, '-')}.txt`,
    fileSize: `${(text.length / 1024).toFixed(1)} KB`,
    totalPages: 1,
    totalParagraphs: paragraphs.length,
    paragraphs,
    currentParagraphIndex: 0,
    progressPercent: 0,
    dateAdded: 'Hoy',
    colorAccent: '#10b981',
    category: 'Nota de lectura',
    summary: paragraphs.slice(0, 2).map((p) => p.text).join(' '),
  };
}

/**
 * Pre-loaded sample documents in Spanish for immediate zero-friction testing
 */
export const SAMPLE_DOCUMENTS: DocumentItem[] = [
  {
    id: 'sample-enfoque-digital',
    title: 'El Arte de Escuchar: Enfoque y Calma en la Era Digital',
    filename: 'enfoque_y_audio.pdf',
    fileSize: '1.2 MB',
    totalPages: 3,
    totalParagraphs: 7,
    currentParagraphIndex: 0,
    progressPercent: 0,
    dateAdded: 'Muestra recomendada',
    colorAccent: '#0ea5e9',
    category: 'Productividad & Mente',
    summary: 'Aprende cómo transformar tus momentos de lectura en experiencias sonoras continuas sin depender de mirar la pantalla de tu móvil.',
    paragraphs: [
      {
        id: 'p-1-0',
        pageNumber: 1,
        paragraphIndex: 0,
        text: 'Bienvenido a VozDoc. Esta aplicación fue diseñada específicamente para resolver un problema cotidiano: querer leer o estudiar documentos mientras caminas, viajas en transporte o haces ejercicio, sin tener que mantener la pantalla de tu celular encendida en la mano.',
      },
      {
        id: 'p-1-1',
        pageNumber: 1,
        paragraphIndex: 1,
        text: 'Cuando la pantalla del teléfono permanece encendida, se consume hasta un ochenta por ciento más de batería y corres el riesgo de toques accidentales en el bolsillo. Con la tecnología de sesión multimedia en segundo plano, tu teléfono trata este documento exactamente igual que a un reproductor de música o podcast.',
      },
      {
        id: 'p-1-2',
        pageNumber: 1,
        paragraphIndex: 2,
        text: 'Puedes apagar la pantalla ahora mismo o bloquear el dispositivo con el botón lateral. La locución continuará de manera fluida, saltando de párrafo en párrafo sin interrupciones.',
      },
      {
        id: 'p-2-3',
        pageNumber: 2,
        paragraphIndex: 3,
        text: 'En tu pantalla de bloqueo verás los controles del sistema: puedes pausar la narración, retroceder al párrafo anterior o avanzar al siguiente. Si utilizas auriculares con botón o gestos táctiles, esos controles también funcionarán a la perfección.',
      },
      {
        id: 'p-2-4',
        pageNumber: 2,
        paragraphIndex: 4,
        text: 'La retención auditiva aumenta notablemente cuando eliminamos las distracciones visuales de notificaciones, mensajes emergentes y redes sociales. Al cerrar los ojos o guardar el teléfono, la atención se concentra enteramente en las ideas expuestas.',
      },
      {
        id: 'p-3-5',
        pageNumber: 3,
        paragraphIndex: 5,
        text: 'Además, cuentas con temporizador de apagado automático ideal para antes de dormir, control de velocidad de reproducción desde cero punto setenta y cinco hasta el doble de velocidad, y selección de voces neuronales con entonación natural en español.',
      },
      {
        id: 'p-3-6',
        pageNumber: 3,
        paragraphIndex: 6,
        text: 'Para comenzar con tus propios documentos, simplemente pulsa en el botón Cargar PDF en la parte superior. Disfruta de la lectura libre de pantallas.',
      },
    ],
  },
  {
    id: 'sample-ia-futuro',
    title: 'Guía Práctica: Modelos Neuronales y Voz Artificial',
    filename: 'guia_modelos_voz.pdf',
    fileSize: '2.4 MB',
    totalPages: 2,
    totalParagraphs: 5,
    currentParagraphIndex: 0,
    progressPercent: 0,
    dateAdded: 'Muestra recomendada',
    colorAccent: '#8b5cf6',
    category: 'Tecnología & IA',
    summary: 'Descubre los fundamentos detrás de la síntesis de voz neuronal moderna y por qué suena tan cercana a un locutor humano.',
    paragraphs: [
      {
        id: 'p-1-0',
        pageNumber: 1,
        paragraphIndex: 0,
        text: 'La generación de voz mediante inteligencia artificial ha dado un salto cuántico en los últimos meses. Atrás quedaron las voces robóticas y monótonas que sonaban a sintetizadores de los años noventa.',
      },
      {
        id: 'p-1-1',
        pageNumber: 1,
        paragraphIndex: 1,
        text: 'Los nuevos modelos neuronales analizan el contexto semántico completo de la oración antes de emitir sonido. Reconocen preguntas, admiraciones, pausas reflexivas y entonaciones dramáticas según el significado del texto.',
      },
      {
        id: 'p-1-2',
        pageNumber: 1,
        paragraphIndex: 2,
        text: 'En esta aplicación, utilizamos el motor Gemini Text to Speech de última generación, capaz de modular la respiración, el ritmo y la calidez del habla en español para una experiencia de audiolibro profesional.',
      },
      {
        id: 'p-2-3',
        pageNumber: 2,
        paragraphIndex: 3,
        text: 'Para garantizar que puedas escuchar sin interrupciones incluso si tu conexión a internet es inestable, VozDoc almacena en memoria los fragmentos de audio ya reproducidos y precarga el siguiente párrafo en segundo plano.',
      },
      {
        id: 'p-2-4',
        pageNumber: 2,
        paragraphIndex: 4,
        text: 'Si te encuentras sin conexión a internet, también puedes activar el modo de voz local del dispositivo, que utiliza los sintetizadores integrados en tu navegador sin requerir datos móviles.',
      },
    ],
  },
  {
    id: 'sample-cuento-relojes',
    title: 'El Secreto de la Torre de los Relojes de Agua',
    filename: 'cronica_literaria.pdf',
    fileSize: '850 KB',
    totalPages: 2,
    totalParagraphs: 5,
    currentParagraphIndex: 0,
    progressPercent: 0,
    dateAdded: 'Relato corto',
    colorAccent: '#f59e0b',
    category: 'Literatura & Ficción',
    summary: 'Un relato breve sobre el tiempo, las corrientes submarinas y un maestro relojero en la antigua Alejandría.',
    paragraphs: [
      {
        id: 'p-1-0',
        pageNumber: 1,
        paragraphIndex: 0,
        text: 'En las costas de Alejandría, mucho antes de que el mundo se midiera con engranajes de acero y microprocesadores de silicio, existía una torre octogonal donde el tiempo se escuchaba caer gota a gota.',
      },
      {
        id: 'p-1-1',
        pageNumber: 1,
        paragraphIndex: 1,
        text: 'El maestro Ctesibio pasaba las tardes observando cómo el agua presurizada empujaba un flotador de bronce que hacía girar cilindros grabados con las constelaciones del firmamento.',
      },
      {
        id: 'p-1-2',
        pageNumber: 1,
        paragraphIndex: 2,
        text: 'Decía que el sonido del agua al fluir tenía la propiedad mágica de calmar la mente de los navegantes cansados y permitirles soñar despiertos sin perder la noción del destino.',
      },
      {
        id: 'p-2-3',
        pageNumber: 2,
        paragraphIndex: 3,
        text: 'Cierra los ojos un momento y deja que la voz te guíe a través de las calles de piedra bañadas por la brisa salina del mar Mediterráneo.',
      },
      {
        id: 'p-2-4',
        pageNumber: 2,
        paragraphIndex: 4,
        text: 'El tiempo, después de todo, no es algo que debamos apresurar mirando continuamente una pantalla, sino un caudal sereno que se disfruta en cada instante compartido.',
      },
    ],
  },
];

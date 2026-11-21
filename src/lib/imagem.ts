import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Reduz a imagem no próprio celular antes de enviar: qualquer foto (até 20 MB da câmera)
 * vira um JPEG leve, rápido de subir e bonito no PDF.
 */
export async function reduzirImagem(uri: string, larguraMax: number, largura?: number) {
  const acoes = largura && largura > larguraMax ? [{ resize: { width: larguraMax } }] : largura ? [] : [{ resize: { width: larguraMax } }];
  const r = await manipulateAsync(uri, acoes, { compress: 0.75, format: SaveFormat.JPEG, base64: true });
  return { base64: r.base64!, mime: 'image/jpeg', ext: 'jpg' };
}

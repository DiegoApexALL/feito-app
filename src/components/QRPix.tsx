import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { cores } from '@/theme';

/** Desenha o QR Code do Pix (funciona no celular e no navegador). */
export function QRPix({ codigo, tamanho = 200 }: { codigo: string; tamanho?: number }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    QRCode.toString(codigo, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }).then((s) => vivo && setSvg(s));
    return () => {
      vivo = false;
    };
  }, [codigo]);

  if (!svg) {
    return (
      <View style={{ width: tamanho, height: tamanho, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={cores.primaria} />
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <Image
        source={{ uri: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` }}
        style={{ width: tamanho, height: tamanho }}
        accessibilityLabel="QR Code do Pix"
      />
    );
  }

  return (
    <View accessible accessibilityLabel="QR Code do Pix" style={{ backgroundColor: '#fff', padding: 4 }}>
      <SvgXml xml={svg} width={tamanho} height={tamanho} />
    </View>
  );
}

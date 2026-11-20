import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarItens } from '../src/lib/montarItens.ts';
import { crc16, gerarPixCopiaECola } from '../src/lib/pix.ts';

test('frase típica de eletricista', () => {
  const itens = montarItens('troquei 3 tomadas a 50 cada, 10 metros de fio por 45 e mão de obra 200');
  assert.equal(itens.length, 3);
  assert.deepEqual(itens[0], { tipo: 'servico', descricao: 'Troca de tomadas', quantidade: 3, unidade: 'un', valor_unitario: 50 });
  assert.deepEqual(itens[1], { tipo: 'material', descricao: 'Fio', quantidade: 10, unidade: 'm', valor_unitario: 4.5 });
  assert.deepEqual(itens[2], { tipo: 'servico', descricao: 'Mão de obra', quantidade: 1, unidade: 'un', valor_unitario: 200 });
});

test('pedreiro com sacos e reais', () => {
  const itens = montarItens('comprei 4 sacos de cimento 160 reais; assentei piso da cozinha cobrei 800');
  assert.equal(itens.length, 2);
  assert.equal(itens[0].tipo, 'material');
  assert.equal(itens[0].unidade, 'saco');
  assert.equal(itens[0].quantidade, 4);
  assert.equal(itens[0].valor_unitario, 40);
  assert.equal(itens[0].descricao, 'Cimento');
  assert.equal(itens[1].tipo, 'servico');
  assert.equal(itens[1].descricao, 'Assentamento de piso da cozinha');
  assert.equal(itens[1].valor_unitario, 800);
});

test('números por extenso e R$', () => {
  const itens = montarItens('instalei duas luminárias R$ 120');
  assert.equal(itens[0].quantidade, 2);
  assert.equal(itens[0].valor_unitario, 60);
  assert.equal(itens[0].descricao, 'Instalação de luminárias');
});

test('valores com milhar', () => {
  const itens = montarItens('pintura da casa toda 2.500,00 reais');
  assert.equal(itens[0].valor_unitario, 2500);
  assert.equal(itens[0].tipo, 'servico');
});

test('sem preço fica zerado para preencher', () => {
  const itens = montarItens('troquei o disjuntor');
  assert.equal(itens.length, 1);
  assert.equal(itens[0].valor_unitario, 0);
  assert.equal(itens[0].descricao, 'Troca de disjuntor');
});

test('CRC16 do BR Code confere com o exemplo do Banco Central', () => {
  // exemplo do Manual de Padrões para Iniciação do Pix (BCB)
  const base =
    '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304';
  assert.equal(crc16(base), '1D3D');
});

test('Pix copia e cola com valor', () => {
  const p = gerarPixCopiaECola({ chave: '+5511987654321', nome: 'João da Silva', cidade: 'São Paulo', valor: 345, txid: 'FEITO12' });
  assert.ok(p.startsWith('000201'));
  assert.ok(p.includes('0014br.gov.bcb.pix'));
  assert.ok(p.includes('5406345.00'));
  assert.ok(p.includes('5913JOAO DA SILVA'));
  assert.ok(p.includes('6009SAO PAULO'));
  assert.equal(p.slice(-4), crc16(p.slice(0, -4)));
});

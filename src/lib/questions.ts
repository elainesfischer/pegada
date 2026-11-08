// Questionário: 5 categorias x 4 perguntas. A posição da alternativa (A–D) = pontos (0–3).
// Os pontos NUNCA são exibidos ao aluno.

export type Category = {
  id: "alimentacao" | "transporte" | "energia" | "consumo" | "residuos";
  title: string;
  icon: "Sprout" | "Bike" | "Zap" | "ShoppingBag" | "Droplets";
  questions: { text: string; options: [string, string, string, string] }[];
};

export const CATEGORIES: Category[] = [
  {
    id: "alimentacao", title: "Alimentação", icon: "Sprout",
    questions: [
      { text: "Com que frequência você consome carne bovina?",
        options: ["Nunca ou quase nunca", "Aproximadamente 1 vez por semana", "De 2 a 4 vezes por semana", "5 ou mais vezes por semana"] },
      { text: "Com que frequência você consome outros tipos de carne, como frango, porco ou peixe?",
        options: ["Nunca ou quase nunca", "1 a 2 vezes por semana", "3 a 5 vezes por semana", "Quase todos os dias"] },
      { text: "Quanto dos alimentos consumidos na sua casa costuma ser fresco, local, da estação ou pouco processado?",
        options: ["A maior parte", "Mais da metade", "Menos da metade", "Quase nada"] },
      { text: "Com que frequência ocorre desperdício de alimentos na sua casa?",
        options: ["Raramente", "Às vezes", "Frequentemente", "Muito frequentemente"] },
    ],
  },
  {
    id: "transporte", title: "Transporte", icon: "Bike",
    questions: [
      { text: "Qual é a principal forma que você utiliza para ir à universidade/escola ou para realizar seus deslocamentos diários?",
        options: ["A pé ou bicicleta", "Transporte coletivo", "Carro compartilhado", "Carro ou moto individual"] },
      { text: "Em uma semana normal, aproximadamente quanto tempo você passa em carro ou moto particular?",
        options: ["Menos de 1 hora", "De 1 a 3 horas", "De 3 a 7 horas", "Mais de 7 horas"] },
      { text: "Quando o transporte coletivo é uma alternativa viável, com que frequência você o utiliza?",
        options: ["Quase sempre", "Frequentemente", "Às vezes", "Quase nunca"] },
      { text: "Quantas viagens de avião você realiza aproximadamente por ano?",
        options: ["Nenhuma", "Uma viagem curta", "Duas ou três viagens ou uma viagem longa", "Quatro ou mais viagens ou várias viagens longas"] },
    ],
  },
  {
    id: "energia", title: "Energia e moradia", icon: "Zap",
    questions: [
      { text: "Você costuma apagar as luzes e desligar aparelhos quando eles não estão sendo utilizados?",
        options: ["Sempre", "Quase sempre", "Às vezes", "Raramente"] },
      { text: "Quanto tempo por dia sua residência utiliza ar-condicionado ou aquecedor quando necessário?",
        options: ["Não utiliza ou utiliza muito pouco", "Até 2 horas", "Entre 2 e 6 horas", "Mais de 6 horas"] },
      { text: "A maioria das lâmpadas da sua residência utiliza tecnologia LED ou outra tecnologia de alta eficiência energética?",
        options: ["Sim, quase todas", "Mais da metade", "Menos da metade", "Não ou não sei"] },
      { text: "Na sua residência, a eficiência energética é considerada na compra e utilização de equipamentos?",
        options: ["Sempre", "Frequentemente", "Às vezes", "Raramente"] },
    ],
  },
  {
    id: "consumo", title: "Consumo", icon: "ShoppingBag",
    questions: [
      { text: "Com que frequência você compra roupas, calçados ou acessórios novos?",
        options: ["Poucas vezes por ano", "A cada dois ou três meses", "Aproximadamente todo mês", "Várias vezes por mês"] },
      { text: "Quando algum objeto quebra, o que você normalmente faz?",
        options: ["Conserto, reutilizo ou adapto", "Tento consertar antes de substituir", "Geralmente substituo", "Normalmente compro outro imediatamente"] },
      { text: "Com que frequência você compra produtos usados, troca, empresta ou compartilha objetos?",
        options: ["Frequentemente", "Às vezes", "Raramente", "Nunca"] },
      { text: "Com que frequência você troca celular, computador ou outros equipamentos eletrônicos?",
        options: ["Somente quando deixam de funcionar", "A cada quatro anos ou mais", "A cada dois ou três anos", "Praticamente todos os anos"] },
    ],
  },
  {
    id: "residuos", title: "Resíduos e água", icon: "Droplets",
    questions: [
      { text: "Na sua residência, os materiais recicláveis são separados dos demais resíduos?",
        options: ["Sempre", "Frequentemente", "Às vezes", "Raramente ou nunca"] },
      { text: "Você costuma utilizar garrafas, copos, sacolas ou recipientes reutilizáveis?",
        options: ["Quase sempre", "Frequentemente", "Às vezes", "Raramente"] },
      { text: "Quanto tempo dura, em média, seu banho?",
        options: ["Até 5 minutos", "De 6 a 10 minutos", "De 11 a 15 minutos", "Mais de 15 minutos"] },
      { text: "Você evita deixar a torneira aberta sem necessidade, por exemplo enquanto escova os dentes ou ensaboa a louça?",
        options: ["Sempre", "Quase sempre", "Às vezes", "Raramente"] },
    ],
  },
];

export const TOTAL_QUESTIONS = 20;
export const LETTERS = ["A", "B", "C", "D"] as const;

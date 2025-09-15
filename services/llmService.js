import OpenAI from 'openai'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateSummary(transcriptText, maxTokens = 400) {
  const prompt = `You are a helpful assistant. Summarize the following call transcript into a concise actionable summary for another agent. Bullet points and key facts only.\n\nTranscript:\n${transcriptText}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // pick model you have access to (or gpt-4o, gpt-4, gpt-3.5-turbo)
    messages: [{ role: 'system', content: 'You are an assistant that summarizes calls' }, { role: 'user', content: prompt }],
    max_tokens: maxTokens,
    temperature: 0.2,
  });

  const text = completion.choices[0].message.content;
  return text;
}

export default generateSummary
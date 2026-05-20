import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';

    // withoutBG API'ye gönder (base64 endpoint)
    const response = await fetch('https://api.withoutbg.com/v1.0/image-without-background-base64', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.WITHOUTBG_API_KEY || '',
      },
      body: JSON.stringify({
        image_base64: base64,
        image_mime_type: mimeType,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('withoutBG API error:', error);
      return NextResponse.json({ error: 'Background removal failed' }, { status: response.status });
    }

    const data = await response.json();
    const resultBase64 = data.img_without_background_base64;
    const resultMimeType = data.image_mime_type || 'image/png';
    const dataUrl = `data:${resultMimeType};base64,${resultBase64}`;

    return NextResponse.json({ imageUrl: dataUrl });
  } catch (error) {
    console.error('Error removing background:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

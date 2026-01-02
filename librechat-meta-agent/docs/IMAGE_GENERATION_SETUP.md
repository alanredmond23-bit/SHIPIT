# Image Generation System - Setup & Usage Guide

## Overview

A comprehensive multi-provider image generation system supporting DALL-E 3, Stability AI, and Replicate. This system provides a unified API and beautiful UI for generating, editing, and managing AI-generated images.

## Features

### Core Capabilities
- ✨ **Multi-Provider Support**: DALL-E 3, Stability AI (SDXL), Replicate (Flux, SDXL Lightning, etc.)
- 🎨 **Image Generation**: Text-to-image with advanced parameters
- ✏️ **Image Editing**: Inpainting, outpainting, variations
- 🔍 **Image Upscaling**: 2x and 4x upscaling with Real-ESRGAN
- 🎭 **Style Transfer**: Apply artistic styles to existing images
- 🤖 **AI Prompt Enhancement**: Claude-powered prompt optimization
- 📊 **Analytics**: Usage tracking, cost analysis, provider performance
- 💾 **Storage**: Organized database with full metadata
- ⭐ **Collections**: Create albums and save favorites

### UI Features
- Beautiful, responsive interface with dark theme
- Real-time generation progress
- Image history and favorites
- Drag-and-drop image upload
- Lightbox for detailed viewing
- Style presets with visual previews
- Advanced settings (steps, CFG scale, seeds)
- Batch generation support
- Download in multiple formats

## Architecture

```
librechat-meta-agent/
├── schemas/
│   └── 006_images_schema.sql          # Database schema
├── orchestrator/src/
│   ├── services/
│   │   ├── image-generation.ts        # Main orchestrator
│   │   └── image/
│   │       ├── types.ts               # TypeScript interfaces
│   │       ├── dalle-provider.ts      # DALL-E 3 provider
│   │       ├── stability-provider.ts  # Stability AI provider
│   │       └── replicate-provider.ts  # Replicate provider
│   └── api/
│       └── images.ts                  # REST API routes
└── ui-extensions/components/ImageGen/
    ├── ImageGenerator.tsx             # Main UI component
    └── styles.css                     # Custom styles
```

## Installation

### 1. Database Setup

Run the schema migration:

```bash
psql -U your_user -d your_database -f schemas/006_images_schema.sql
```

### 2. Environment Variables

Add the following to your `.env` file:

```env
# DALL-E 3 (OpenAI)
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...  # Optional

# Stability AI
STABILITY_API_KEY=sk-...

# Replicate
REPLICATE_API_TOKEN=r8_...

# Anthropic (for prompt enhancement & image analysis)
ANTHROPIC_API_KEY=sk-ant-...

# Storage (optional)
IMAGE_STORAGE_PATH=/path/to/storage
IMAGE_CDN_URL=https://your-cdn.com
```

### 3. Install Dependencies

The required packages are already in `package.json`:

```bash
cd orchestrator && npm install
cd ../ui-extensions && npm install
```

### 4. Initialize the Service

In your `orchestrator/src/index.ts`, add:

```typescript
import { ImageGenerationEngine } from './services/image-generation';
import { createImageRoutes } from './api/images';

// Initialize the engine
const imageEngine = new ImageGenerationEngine(db, logger, {
  dalle: {
    enabled: true,
    apiKey: process.env.OPENAI_API_KEY!,
    organization: process.env.OPENAI_ORG_ID,
  },
  stability: {
    enabled: true,
    apiKey: process.env.STABILITY_API_KEY!,
  },
  replicate: {
    enabled: true,
    apiKey: process.env.REPLICATE_API_TOKEN!,
  },
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  defaultProvider: 'dalle3',
});

// Register routes
const imageRoutes = createImageRoutes(db, imageEngine, logger);
app.use('/api/images', imageRoutes);
```

### 5. Add UI Component

In your Next.js app, import the component:

```typescript
import ImageGenerator from '@/components/ImageGen/ImageGenerator';

export default function ImageGenPage() {
  return <ImageGenerator />;
}
```

## API Reference

### Generate Images

```http
POST /api/images/generate
Content-Type: application/json

{
  "prompt": "A serene landscape with mountains and a lake at sunset",
  "provider": "dalle3",
  "size": "1024x1024",
  "quality": "hd",
  "style": "vivid",
  "count": 1,
  "negativePrompt": "blurry, low quality",
  "steps": 30,
  "cfgScale": 7,
  "seed": 42
}
```

**Response:**
```json
{
  "success": true,
  "images": [
    {
      "id": "uuid",
      "url": "https://...",
      "prompt": "...",
      "revisedPrompt": "...",
      "provider": "dalle3",
      "model": "dall-e-3",
      "size": "1024x1024",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

### Edit Image

```http
POST /api/images/edit
Content-Type: application/json

{
  "imageUrl": "https://...",
  "prompt": "Add a rainbow in the sky",
  "editType": "inpaint",
  "mask": "base64-encoded-mask",
  "strength": 0.8
}
```

### Create Variations

```http
POST /api/images/variations
Content-Type: application/json

{
  "imageUrl": "https://...",
  "count": 4,
  "provider": "stability"
}
```

### Upscale Image

```http
POST /api/images/upscale
Content-Type: application/json

{
  "imageUrl": "https://...",
  "scale": 2,
  "provider": "stability"
}
```

### Enhance Prompt

```http
POST /api/images/enhance-prompt
Content-Type: application/json

{
  "prompt": "a cat"
}
```

**Response:**
```json
{
  "success": true,
  "enhancedPrompt": "A majestic cat with piercing eyes, detailed fur texture, professional photography, golden hour lighting, shallow depth of field",
  "suggestions": [
    "A playful kitten in a sunlit garden",
    "An elegant Siamese cat portrait"
  ],
  "tags": ["cat", "feline", "portrait", "photography"]
}
```

### Analyze Image

```http
POST /api/images/analyze
Content-Type: application/json

{
  "imageUrl": "https://..."
}
```

### Get History

```http
GET /api/images/history?userId=user123&limit=50&offset=0
```

### Get Providers

```http
GET /api/images/providers
```

### Health Check

```http
GET /api/images/health
```

## Provider Comparison

| Feature | DALL-E 3 | Stability AI | Replicate |
|---------|----------|--------------|-----------|
| Text-to-Image | ✅ | ✅ | ✅ |
| Image-to-Image | ⚠️ (DALL-E 2) | ✅ | ✅ |
| Inpainting | ⚠️ (DALL-E 2) | ✅ | ✅ |
| Variations | ⚠️ (DALL-E 2) | ✅ | ✅ |
| Upscaling | ❌ | ✅ | ✅ |
| Style Transfer | ❌ | ✅ | ✅ |
| Max Images | 1 | 10 | 10 |
| Quality | Excellent | Excellent | Excellent |
| Speed | Fast | Medium | Varies |
| Cost | $0.04-$0.12 | ~$0.02 | Pay per second |

## Database Schema

### Tables

1. **generated_images**: Stores all generated images with full metadata
2. **image_favorites**: User favorites
3. **prompt_templates**: Reusable prompt templates
4. **image_collections**: User-created albums
5. **collection_images**: Many-to-many relationship
6. **image_generation_stats**: Daily aggregated statistics

### Views

- `user_generation_summary`: Per-user statistics
- `provider_performance`: Provider success rates and timing
- `popular_prompt_templates`: Most-used templates
- `recent_generations`: Recent images with favorite status

## Cost Management

### Cost Tracking

All generations automatically track costs:

```sql
SELECT
  user_id,
  DATE(created_at) as date,
  provider,
  COUNT(*) as images,
  SUM(cost_usd) as total_cost
FROM generated_images
WHERE user_id = 'user123'
GROUP BY user_id, DATE(created_at), provider
ORDER BY date DESC;
```

### Budget Limits

Implement budget limits in your application:

```typescript
// Check daily budget before generation
const todaySpent = await db.query(`
  SELECT COALESCE(SUM(cost_usd), 0) as spent
  FROM generated_images
  WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE
`, [userId]);

if (todaySpent.rows[0].spent >= dailyBudget) {
  throw new Error('Daily budget exceeded');
}
```

## Performance Optimization

### Rate Limiting

Each provider has built-in rate limiting:
- DALL-E: 1 request per second
- Stability: No strict limit (use responsibly)
- Replicate: Per-model limits

### Caching

Implement caching for identical prompts:

```typescript
// Check for existing generation with same parameters
const existing = await db.query(`
  SELECT * FROM generated_images
  WHERE prompt = $1 AND provider = $2 AND size = $3
  AND created_at > NOW() - INTERVAL '7 days'
  LIMIT 1
`, [prompt, provider, size]);

if (existing.rows.length > 0) {
  return existing.rows[0]; // Return cached result
}
```

### Storage Optimization

- Store thumbnails for quick previews
- Compress images before storage
- Use CDN for serving images
- Implement automatic cleanup of old images

## Advanced Usage

### Custom Style Presets

Add custom styles in the UI:

```typescript
const CUSTOM_STYLES = [
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Neon lights and futuristic',
    value: 'cyberpunk, neon lights, futuristic city, high tech',
  },
  // ... more styles
];
```

### Batch Processing

Process multiple prompts:

```typescript
const prompts = [
  'A red apple',
  'A green pear',
  'A yellow banana',
];

for (const prompt of prompts) {
  await imageEngine.generate({
    prompt,
    provider: 'stability',
    size: '1024x1024',
    count: 1,
  });

  // Delay between requests
  await new Promise(resolve => setTimeout(resolve, 2000));
}
```

### Webhook Notifications

Add webhooks for long-running generations:

```typescript
// In replicate-provider.ts
private async waitForPrediction(predictionId: string) {
  // Instead of polling, use webhook
  const prediction = await this.createPrediction(modelId, {
    ...input,
    webhook: 'https://your-app.com/webhooks/replicate',
    webhook_events_filter: ['completed'],
  });
}
```

## Troubleshooting

### Common Issues

1. **"Provider not available"**
   - Check API keys in `.env`
   - Verify provider is enabled in config
   - Run health check: `GET /api/images/health`

2. **"Image generation timeout"**
   - Increase timeout in provider config
   - Use faster models (e.g., SDXL Lightning)
   - Check provider status page

3. **"Database error"**
   - Verify schema is applied: `psql -d db -c "\dt generated_images"`
   - Check connection string
   - Review logs for specific SQL errors

4. **"Out of memory"**
   - Reduce batch size
   - Enable streaming for large images
   - Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096`

## Security Best Practices

1. **API Key Protection**
   - Never commit API keys
   - Use environment variables
   - Rotate keys regularly

2. **Input Validation**
   - Sanitize all prompts
   - Limit prompt length (max 4000 chars)
   - Block inappropriate content

3. **Rate Limiting**
   - Implement per-user rate limits
   - Use Redis for distributed rate limiting
   - Monitor for abuse patterns

4. **Content Moderation**
   - Filter NSFW content
   - Log all generations
   - Implement reporting system

## Monitoring

### Key Metrics

- Generations per hour
- Success rate by provider
- Average generation time
- Cost per user
- Error rates

### Logging

All operations are logged with structured logging:

```typescript
logger.info({
  userId,
  provider,
  prompt: prompt.substring(0, 100),
  generationTime,
  cost,
}, 'Image generated successfully');
```

### Alerts

Set up alerts for:
- High error rates (>5%)
- Slow responses (>60s)
- Budget exceeded
- API key issues

## Future Enhancements

- [ ] Image-to-video generation
- [ ] Real-time collaborative editing
- [ ] Advanced inpainting brush tool
- [ ] Style mixing (combine multiple styles)
- [ ] ControlNet integration
- [ ] Fine-tuned models support
- [ ] Automatic prompt translation
- [ ] A/B testing for prompts
- [ ] Social sharing features
- [ ] Mobile app

## Support

For issues or questions:
- Check logs: `orchestrator/logs/`
- Review API responses
- Test individual providers
- Check provider status pages

## License

MIT License - See LICENSE file for details

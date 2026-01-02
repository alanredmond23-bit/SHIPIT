# Image Generation System - Integration Guide

## Quick Integration Steps

### 1. Update Main Server (orchestrator/src/index.ts)

Add this to your main server file:

```typescript
import { ImageGenerationEngine } from './services/image-generation';
import { createImageRoutes } from './api/images';

// After creating db and logger...

// Initialize Image Generation Engine
const imageEngine = new ImageGenerationEngine(db, logger, {
  dalle: {
    enabled: !!process.env.OPENAI_API_KEY,
    apiKey: process.env.OPENAI_API_KEY || '',
    organization: process.env.OPENAI_ORG_ID,
    maxRetries: 3,
    timeout: 60000,
  },
  stability: {
    enabled: !!process.env.STABILITY_API_KEY,
    apiKey: process.env.STABILITY_API_KEY || '',
  },
  replicate: {
    enabled: !!process.env.REPLICATE_API_TOKEN,
    apiKey: process.env.REPLICATE_API_TOKEN || '',
  },
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  defaultProvider: 'dalle3',
  storageBasePath: process.env.IMAGE_STORAGE_PATH || './storage/images',
});

// Register API routes
const imageRoutes = createImageRoutes(db, imageEngine, logger);
app.use('/api/images', imageRoutes);

logger.info('Image generation system initialized');
```

### 2. Update API Routes Registry (orchestrator/src/api/routes.ts)

If you have a central routes file, add:

```typescript
import { createImageRoutes } from './images';

export function registerRoutes(app: Express, db: Pool, logger: Logger) {
  // ... existing routes ...

  // Image generation routes
  const imageEngine = new ImageGenerationEngine(db, logger, {
    // ... config ...
  });

  app.use('/api/images', createImageRoutes(db, imageEngine, logger));

  logger.info('All routes registered');
}
```

### 3. Add UI Route (ui-extensions/app/images/page.tsx)

Create a new page for the image generator:

```typescript
import ImageGenerator from '@/components/ImageGen/ImageGenerator';

export default function ImagesPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <ImageGenerator />
    </div>
  );
}

export const metadata = {
  title: 'AI Image Generator',
  description: 'Generate stunning images with AI',
};
```

### 4. Add Navigation Link

In your navigation component:

```typescript
import { Wand2 } from 'lucide-react';

// Add to navigation items
const navItems = [
  // ... existing items ...
  {
    name: 'Images',
    href: '/images',
    icon: Wand2,
  },
];
```

### 5. Environment Variables

Create/update `.env`:

```bash
# OpenAI (DALL-E 3)
OPENAI_API_KEY=sk-proj-...
OPENAI_ORG_ID=org-...

# Stability AI
STABILITY_API_KEY=sk-...

# Replicate
REPLICATE_API_TOKEN=r8_...

# Anthropic (for prompt enhancement)
ANTHROPIC_API_KEY=sk-ant-...

# Storage
IMAGE_STORAGE_PATH=./storage/images
IMAGE_CDN_URL=https://cdn.example.com
```

### 6. Run Database Migration

```bash
# Apply the schema
psql -U postgres -d librechat_meta -f schemas/006_images_schema.sql

# Verify tables were created
psql -U postgres -d librechat_meta -c "\dt generated_images"
```

### 7. Test the Integration

```bash
# Start the server
cd orchestrator
npm run dev

# In another terminal, start the UI
cd ui-extensions
npm run dev

# Visit http://localhost:3000/images
```

## Testing API Endpoints

### Test Image Generation

```bash
curl -X POST http://localhost:8080/api/images/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful sunset over mountains",
    "provider": "dalle3",
    "size": "1024x1024",
    "quality": "standard",
    "count": 1
  }'
```

### Test Prompt Enhancement

```bash
curl -X POST http://localhost:8080/api/images/enhance-prompt \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a cat"
  }'
```

### Test Provider Health

```bash
curl http://localhost:8080/api/images/health
```

Expected response:
```json
{
  "success": true,
  "providers": {
    "dalle3": true,
    "stability": true,
    "replicate": true
  }
}
```

## Usage Examples

### Basic Image Generation

```typescript
import { ImageGenerationEngine } from './services/image-generation';

// In your route handler
const images = await imageEngine.generate({
  prompt: 'A serene forest landscape with a waterfall',
  provider: 'dalle3',
  size: '1024x1024',
  quality: 'hd',
  style: 'natural',
  count: 1,
});

console.log(images[0].url); // URL to generated image
```

### Image Editing

```typescript
const editedImage = await imageEngine.edit({
  imageUrl: 'https://example.com/image.png',
  prompt: 'Add a rainbow in the sky',
  editType: 'inpaint',
  mask: base64MaskData,
  strength: 0.8,
});
```

### Creating Variations

```typescript
const variations = await imageEngine.createVariations(
  'https://example.com/image.png',
  4, // count
  'stability' // provider
);
```

### Upscaling

```typescript
const upscaled = await imageEngine.upscale(
  'https://example.com/image.png',
  4, // 4x scale
  'stability'
);
```

### Prompt Enhancement

```typescript
const enhanced = await imageEngine.enhancePrompt(
  'a simple cat picture'
);

console.log(enhanced.enhancedPrompt);
// "A majestic cat portrait with detailed fur texture,
//  professional photography, soft lighting, bokeh background"
```

### Image Analysis

```typescript
const analysis = await imageEngine.analyzeImage(
  'https://example.com/image.png'
);

console.log(analysis);
// {
//   description: "A landscape photograph featuring...",
//   suggestions: ["Add more contrast", "Crop to focus on..."],
//   detectedObjects: ["mountain", "sky", "trees"],
//   dominantColors: ["#3b5998", "#8b9dc3", "#dfe3ee"],
//   style: "photorealistic",
//   mood: "peaceful"
// }
```

## Advanced Configuration

### Custom Provider Priority

```typescript
const imageEngine = new ImageGenerationEngine(db, logger, {
  dalle: {
    enabled: true,
    apiKey: process.env.OPENAI_API_KEY!,
    priority: 1, // Highest priority
  },
  stability: {
    enabled: true,
    apiKey: process.env.STABILITY_API_KEY!,
    priority: 2,
  },
  replicate: {
    enabled: true,
    apiKey: process.env.REPLICATE_API_TOKEN!,
    priority: 3, // Fallback
  },
  // Automatically fallback if primary provider fails
  autoFallback: true,
});
```

### Custom Storage Handler

```typescript
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

class CustomImageStorage {
  private s3: S3Client;

  async saveImage(imageUrl: string, metadata: any): Promise<string> {
    // Download image
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();

    // Process with sharp
    const processed = await sharp(Buffer.from(buffer))
      .resize(2048, 2048, { fit: 'inside' })
      .webp({ quality: 85 })
      .toBuffer();

    // Upload to S3
    const key = `images/${metadata.id}.webp`;
    await this.s3.send(new PutObjectCommand({
      Bucket: 'my-bucket',
      Key: key,
      Body: processed,
      ContentType: 'image/webp',
    }));

    return `https://cdn.example.com/${key}`;
  }
}

// Use in image generation
const savedUrl = await customStorage.saveImage(image.url, image);
```

### Webhook Integration

```typescript
// Create webhook endpoint for long-running generations
app.post('/webhooks/image-complete', async (req, res) => {
  const { imageId, status, url } = req.body;

  if (status === 'completed') {
    // Update database
    await db.query(
      `UPDATE generated_images
       SET status = 'completed', url = $1, completed_at = NOW()
       WHERE id = $2`,
      [url, imageId]
    );

    // Notify user via WebSocket
    io.to(userId).emit('imageReady', { imageId, url });
  }

  res.json({ success: true });
});
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const imageGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: 'Too many image generation requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/images/generate', imageGenerationLimiter);
```

### Cost Tracking Middleware

```typescript
app.post('/api/images/generate', async (req, res, next) => {
  const userId = req.body.userId;

  // Check user's daily budget
  const spent = await db.query(
    `SELECT COALESCE(SUM(cost_usd), 0) as total
     FROM generated_images
     WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE`,
    [userId]
  );

  const dailyBudget = 10.00; // $10 per day
  if (spent.rows[0].total >= dailyBudget) {
    return res.status(429).json({
      error: {
        message: 'Daily budget exceeded',
        spent: spent.rows[0].total,
        limit: dailyBudget,
      },
    });
  }

  next();
});
```

## Monitoring and Analytics

### Create Dashboard Query

```sql
-- Daily generation stats
CREATE VIEW daily_stats AS
SELECT
  DATE(created_at) as date,
  provider,
  COUNT(*) as total_images,
  COUNT(*) FILTER (WHERE status = 'completed') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(generation_time_ms) as avg_time,
  SUM(cost_usd) as total_cost
FROM generated_images
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), provider
ORDER BY date DESC, provider;
```

### Analytics Endpoint

```typescript
router.get('/analytics', async (req, res) => {
  const { startDate, endDate } = req.query;

  const stats = await db.query(`
    SELECT
      DATE(created_at) as date,
      provider,
      COUNT(*) as images,
      AVG(generation_time_ms) as avg_time,
      SUM(cost_usd) as cost
    FROM generated_images
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY DATE(created_at), provider
    ORDER BY date DESC
  `, [startDate, endDate]);

  res.json({ stats: stats.rows });
});
```

## Troubleshooting Integration Issues

### Check Provider Initialization

```typescript
// Add to your startup logs
const providers = imageEngine.getAvailableProviders();
logger.info({ providers }, 'Available image providers');

// Test each provider
const health = await imageEngine.healthCheck();
logger.info({ health }, 'Provider health check');
```

### Enable Debug Logging

```typescript
const imageEngine = new ImageGenerationEngine(db, logger.child({ level: 'debug' }), {
  // ... config ...
});
```

### Common Integration Errors

1. **"Cannot find module './services/image-generation'"**
   - Ensure all files are in correct locations
   - Run `npm run build` in orchestrator

2. **"Database table not found"**
   - Run migration: `psql -f schemas/006_images_schema.sql`
   - Check table exists: `\dt generated_images`

3. **"Provider API key invalid"**
   - Verify API keys in `.env`
   - Check API key format (no extra spaces/quotes)
   - Test keys directly with provider

4. **"CORS error in UI"**
   - Add CORS middleware in orchestrator:
   ```typescript
   import cors from 'cors';
   app.use(cors({ origin: 'http://localhost:3000' }));
   ```

## Next Steps

1. ✅ Complete integration following this guide
2. 🧪 Test all API endpoints
3. 🎨 Customize UI styling to match your brand
4. 📊 Set up monitoring and alerts
5. 🔒 Implement authentication and authorization
6. 💾 Configure production storage (S3, CloudFlare R2, etc.)
7. 📈 Enable analytics and usage tracking
8. 🚀 Deploy to production

## Production Checklist

- [ ] All environment variables set
- [ ] Database schema applied
- [ ] API keys validated
- [ ] Rate limiting configured
- [ ] Error monitoring enabled (Sentry, etc.)
- [ ] Logging configured
- [ ] Storage configured (S3/CDN)
- [ ] Backup strategy in place
- [ ] SSL/TLS enabled
- [ ] CORS properly configured
- [ ] Load testing completed
- [ ] Cost alerts configured
- [ ] Documentation updated
- [ ] Team trained on system

## Support

For integration help:
- Review error logs in `orchestrator/logs/`
- Check API responses for detailed error messages
- Test providers individually at `/api/images/health`
- Review this guide and main setup documentation

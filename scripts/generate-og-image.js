import { createCanvas, loadImage, registerFont } from 'canvas';
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WIDTH = 1200;
const HEIGHT = 630;

// Design specifications
const SAFE_ZONE_LEFT = 100;
const SAFE_ZONE_RIGHT = 100;
const SAFE_ZONE_TOP = 80;
const SAFE_ZONE_BOTTOM = 80;

// Colors
const BG_COLOR = '#F3F9FF'; // Very light blue
const NAME_COLOR = '#0F172A'; // Near-black
const ROLE_COLOR = '#2563EB'; // Blue accent
const MUTED_COLOR = '#475569'; // Neutral gray (not used in this design)

// Layout: 65% text area, 35% avatar area
const TEXT_AREA_WIDTH = WIDTH * 0.65;
const AVATAR_AREA_START = TEXT_AREA_WIDTH;

async function generateOGImage() {
  try {
    // Use modern sans-serif fonts (Inter, Poppins, or system fallbacks)
    // Try to use system fonts that are clean and modern
    const fontFamily = '"Inter", "Poppins", "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif';
    console.log('Using modern sans-serif fonts (Inter/Poppins fallback)');

    // Create canvas
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    // Fill background with solid light blue
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Load and draw avatar image (right side, circular)
    const avatarPath = join(__dirname, '../public/avatar.png');
    const avatarSize = 260; // Between 240-280px as specified
    const avatarCenterX = AVATAR_AREA_START + (WIDTH - AVATAR_AREA_START) / 2;
    const avatarCenterY = HEIGHT / 2;
    const avatarX = avatarCenterX - avatarSize / 2;
    const avatarY = avatarCenterY - avatarSize / 2;

    if (existsSync(avatarPath)) {
      try {
        const avatar = await loadImage(avatarPath);
        
        // Draw circular avatar with clipping
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();
        
        // No border, no decorations - clean professional look
      } catch (error) {
        console.warn('Could not load avatar image:', error.message);
      }
    }

    // Text content (left side, vertically centered)
    const textX = SAFE_ZONE_LEFT;
    const textAreaHeight = HEIGHT - SAFE_ZONE_TOP - SAFE_ZONE_BOTTOM;
    const textStartY = SAFE_ZONE_TOP + textAreaHeight / 2;

    // Calculate text positions for vertical centering
    // Name: bold, 68px (between 64-72px)
    const nameFontSize = 68;
    const nameLineHeight = nameFontSize * 1.25; // 1.25 line-height
    
    // Role: medium, 34px (between 32-36px)
    const roleFontSize = 34;
    const roleLineHeight = roleFontSize * 1.3; // 1.3 line-height
    
    // Total text height
    const totalTextHeight = nameLineHeight + roleLineHeight + 16; // 16px spacing between lines
    
    // Start Y position to center the text block
    const nameY = textStartY - totalTextHeight / 2;
    const roleY = nameY + nameLineHeight + 16;

    // Draw name text
    ctx.fillStyle = NAME_COLOR;
    ctx.font = `bold ${nameFontSize}px ${fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Nguyen Hoang Tin', textX, nameY);

    // Draw role text
    ctx.fillStyle = ROLE_COLOR;
    ctx.font = `500 ${roleFontSize}px ${fontFamily}`; // medium weight (500)
    ctx.textBaseline = 'top';
    ctx.fillText('Full-Stack Developer', textX, roleY);

    // Export as PNG
    const outputPath = join(__dirname, '../public/og-image.png');
    const buffer = canvas.toBuffer('image/png');
    
    // Check file size
    const fileSizeKB = buffer.length / 1024;
    console.log(`Generated OG image: ${fileSizeKB.toFixed(2)} KB`);

    if (fileSizeKB > 300) {
      console.warn(`Warning: OG image size (${fileSizeKB.toFixed(2)} KB) exceeds 300 KB target`);
    }

    await writeFile(outputPath, buffer);
    console.log(`✓ OG image saved to: ${outputPath}`);
    console.log(`  Dimensions: ${WIDTH}×${HEIGHT}px`);
    console.log(`  File size: ${fileSizeKB.toFixed(2)} KB`);
    console.log(`  Safe zone: ${SAFE_ZONE_LEFT}px left/right, ${SAFE_ZONE_TOP}px top/bottom`);
    console.log(`  Layout: ${(TEXT_AREA_WIDTH / WIDTH * 100).toFixed(0)}% text, ${((WIDTH - TEXT_AREA_WIDTH) / WIDTH * 100).toFixed(0)}% avatar`);

  } catch (error) {
    console.error('Error generating OG image:', error);
    process.exit(1);
  }
}

generateOGImage();


// A. ثوابت پروژه (Project Constants)
// **********************************************
// 🔧 سیستم کش برای بهینه‌سازی
let PROCESSED_FILE_IDS_CACHE = null;
let CACHE_TIMESTAMP = null;
const CACHE_DURATION = 30000; // 30 ثانیه کش
// این مقادیر را با شناسه‌ها و آدرس‌های خود جایگزین کنید
const SOURCE_FOLDER_ID = '1jZ1FWhaKinH3CtBVIqTd2Z9A1XfNImlu'; // شناسه پوشه ورودی شما
const ARCHIVE_FOLDER_ID = '1ZfIHVnFoQ1AFSXHJatJ3MjeVQqdquYkj'; // شناسه پوشه بایگانی شما
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1hKcfoJeqaWrxfSUZgUu-nIwORgpg-hoW3H8z3UZK5D4/edit?gid=0#gid=0'; // URL شیت گوگل برای لاگ

// فرمت‌های مجاز برای پردازش ویدیویی
const ALLOWED_VIDEO_FORMATS = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
const MAX_VIDEO_SIZE_MB = 20;
// **********************************************

// 🔄 سیستم پردازش زنجیره‌ای خودکار
let CURRENT_BATCH = 0;
const BATCH_SIZE = 4;
const DELAY_BETWEEN_BATCHES = 600; // ثانیه

const API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
const UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=multipart';
const GENERATE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const MODEL_NAME = 'gemini-2.5-flash';

// 🔄 ثوابت جدید برای پوشه‌های دسته‌بندی
const FOLDER_MAPPING = {
  'image': '1DAyVkLFKNbk226n1Y-HuWX_PYrkKE7w1', // عکس
  'invalid_video': '1fsZwXjTBHceZOljNCjvKq9u_02s6WdFw', // ویدیوی غیرمجاز
  'audio': '1FzuPqbwx9zkhWH7bGPpPPIjtwZYi2iM8', // فایل صوتی
  'document': '1okP6M1NdAXhSoEsUEBvfgGNw8Z5R91XU', // فایل متنی
  'other': '1BC9FD21GZ3KQJrPMnePRCPZqblVpqlhU' // سایر فرمت‌ها
};

// فرمت‌های فایل‌های متنی
const DOCUMENT_FORMATS = [
  '.txt', '.pdf', '.doc', '.docx', '.odt', 
  '.xls', '.xlsx', '.ppt', '.pptx'
];

// فرمت‌های فایل‌های تصویری
const IMAGE_FORMATS = [
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', 
  '.tiff', '.webp', '.svg', '.heic'
];

// فرمت‌های فایل‌های صوتی  
const AUDIO_FORMATS = [
  '.mp3', '.wav', '.aac', '.flac', '.opus', '.ogg',
  '.m4a', '.wma', '.aiff'
];


const JSON_SCHEMA = {
  type: 'object',
  properties: {
    AnalysisResult: {
      type: 'object',
      properties: {
        File_ID: { type: 'string' },
        File_Name: { type: 'string' },
        New_File_Name: { type: 'string' },
        File_Link: { type: 'string' },
        
        // بخش شناسایی اشخاص
        Persons_Identified: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              Name: { type: 'string' },
              Role: { type: 'string' },
              Description: { type: 'string' },
              Confidence: { type: 'string' }
            }
          }
        },
        
        // 🎵 بخش جدید: تشخیص موسیقی
        Music_Analysis: {
          type: 'object',
          properties: {
            Identified_Tracks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  Track_Name: { type: 'string' },
                  Artist: { type: 'string' },
                  Genre: { type: 'string' },
                  Confidence: { type: 'string' },
                  Timestamp: { type: 'string' }
                }
              }
            },
            Music_Genre: { type: 'string' },
            Original_Score: { type: 'boolean' },
            Music_Role: { type: 'string' },
            Quality_Assessment: { type: 'string' },
            Sync_With_Content: { type: 'string' }
          }
        },
        
        // اطلاعات زمانی
        Video_Date_Info: {
          type: 'object',
          properties: {
            Estimated_Creation_Date: { type: 'string' },
            Video_Period: { type: 'string' },
            Date_Confidence: { type: 'string' }
          }
        },
        
        Technical_Specs: {
          type: 'object',
          properties: {
            Video_Quality: { type: 'string' },
            Duration: { type: 'string' },
            Aspect_Ratio: { type: 'string' },
            Filming_Style: { type: 'string' }
          }
        },
        
        Content_Analysis: {
          type: 'object', 
          properties: {
            Main_Topic: { type: 'string' },
            Genre: { type: 'string' },
            Target_Audience: { type: 'string' },
            Key_Message: { type: 'string' }
          }
        },
        
        Farsi_Transcription: { type: 'string' },
        Audio_Analysis: { type: 'string' },
        Visual_Analysis: { type: 'string' },
        Vibe_Atmosphere: { type: 'string' },
        Professional_Insights: { type: 'string' },
        Executive_Summary: { type: 'string' }
      },
      required: ['File_ID', 'File_Name', 'Farsi_Transcription', 'Vibe_Atmosphere', 'Executive_Summary']
    }
  }
};

const SYSTEM_INSTRUCTION = {
  parts: [{ text: "You are an expert Multimodal Video Analyst, specializing in Farsi content and affective computing (vibe analysis). Your task is to process the provided video, transcribe its content, and output the analysis strictly in Farsi and JSON format, adhering to the specified schema." }]
};

const USER_PROMPT = `
فایل ویدیویی پیوست شده را به طور کامل و همه جانبه تحلیل کنید. تحلیل باید به قدری جامع باشد که نیاز به مشاهده خود ویدیو به حداقل ممکن برسد.

# دستورالعمل‌های کلی:
- تمام خروجی به زبان فارسی روان و سلیس باشد
- از اصطلاحات تخصصی مناسب استفاده شود
- تحلیل بر اساس شواهد موجود در ویدیو باشد
- ساختار JSON کاملاً رعایت شود

# بخش‌های مورد تحلیل:

## ۱. شناسایی اشخاص و موجودات
- اسامی اشخاص قابل شناسایی در ویدیو
- نقش هر شخص (گوینده، بازیگر، متخصص، etc.)
- مشخصات ظاهری (لباس، چهره، ویژگی‌های بارز)
- اگر شخص معروفی شناسایی شد، اطلاعات کامل‌تر ارائه شود

## ۲. 🔍 تشخیص و تحلیل موسیقی متن
- شناسایی آهنگ‌های قابل تشخیص (نام آهنگ، هنرمند، ژانر)
- تحلیل موسیقی اصلی (Original Score) اگر وجود دارد
- تشخیص موسیقی‌های شناخته شده (Known Tracks)
- ژانر موسیقی (پاپ، کلاسیک، الکترونیک، سنتی، etc.)
- نقش موسیقی در ویدیو (زمینه، نقاط عطف، تاکیدی)
- کیفیت و حرفه‌ای بودن موسیقی
- هماهنگی موسیقی با محتوای ویدیو
- زمان‌بندی و سینک موسیقی با صحنه‌ها

## ۳. مشخصات فنی ویدیو
- کیفیت تصویر
- نسبت تصویر
- مدت زمان ویدیو
- سبک فیلمبرداری
- نورپردازی و رنگ‌بندی

## ۴. تحلیل محتوای کلی
- موضوع اصلی و فرعی ویدیو
- ژانر
- پیام اصلی و هدف تولیدکننده
- مخاطب هدف

## ۵. تحلیل صوت و موسیقی
- موسیقی زمینه (جزئیات کامل در بخش تشخیص موسیقی)
- افکت‌های صوتی
- کیفیت صدابرداری
- وجود Voice Over یا گوینده

## ۶. تحلیل عناصر بصری
- ترکیب‌بندی
- نمادها و نشانه‌های بصری
- لوگوها و برندها
- متن‌های روی تصویر

## ۷. تحلیل احساسی و atmosفر
- فضای کلی ویدیو
- احساس غالب
- نقاط اوج احساسی

## ۸. اطلاعات زمانی و مکانی
- دوره زمانی ویدیو (قدیمی، جدید، etc.)
- مکان‌های قابل شناسایی
- نشانه‌های جغرافیایی

## ۹. خلاصه اجرایی
- خلاصه ۳ خطی از کل ویدیو
- سه نکته کلیدی
- توصیه‌هایی برای استفاده

# توجه ویژه به موسیقی:
- در صورت شناسایی آهنگ خاص، نام دقیق و هنرمند ذکر شود
- در صورت موسیقی اورجینال، ویژگی‌های آن توصیف شود
- تاثیر موسیقی بر فضای کلی ویدیو تحلیل شود
- کیفیت تولید موسیقی ارزیابی شود

در صورت عدم وجود اطلاعات کافی، "پیدا نشد" ذکر شود.
`;

// ******************************************************
// توابع اصلی 
// ******************************************************

// 🔄 تابع اصلی پردازش زنجیره‌ای - نسخه اصلاح شده
function processChainedBatch() {
  CURRENT_BATCH++;
  Logger.log(`\n🔄 شروع دسته پردازش ${CURRENT_BATCH}...`);
  
  // ابتدا فایل‌ها را سازماندهی کن
  Logger.log("🔍 سازماندهی فایل‌های جدید...");
  const orgResult = organizeFilesAutomatically();
  
  const sourceFolder = DriveApp.getFolderById(SOURCE_FOLDER_ID);
  const archiveFolder = DriveApp.getFolderById(ARCHIVE_FOLDER_ID);
  const sheet = SpreadsheetApp.openByUrl(SHEET_URL).getActiveSheet();

  // 🔄 استفاده از تابع سریع برای پیدا کردن فایل‌های ویدیوی معتبر
  const filesToProcess = findUnprocessedVideoFilesFast().slice(0, BATCH_SIZE);

  if (filesToProcess.length === 0) {
    Logger.log("🎉 همه فایل‌های ویدیوی معتبر پردازش شدند! پردازش زنجیره‌ای متوقف شد.");
    cleanupTriggers();
    return;
  }

  Logger.log(`📦 دسته ${CURRENT_BATCH}: ${filesToProcess.length} فایل ویدیوی معتبر برای پردازش`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const file of filesToProcess) {
    let geminiFileId = null;
    let analysisResult = null;

    try {
      Logger.log(`\n🔹 پردازش فایل ${successCount + errorCount + 1} از ${filesToProcess.length}: ${file.getName()}`);
      
      const geminiFile = uploadFileToGemini(file);
      geminiFileId = geminiFile.name;
      pollFileStatus(geminiFileId);
      analysisResult = analyzeVideoContent(geminiFileId, file.getId(), file.getName());

      const newFileName = generatePersianFileName(analysisResult, file.getName());
      const renamedFileName = renameFileInDrive(file.getId(), newFileName);
      if (renamedFileName) analysisResult.New_File_Name = renamedFileName;

      // ترتیب عمداً این است: اول نتیجه در شیت ثبت شود، بعد فایل جابه‌جا شود.
      // پیشتر برعکس بود و اگر بینِ انتقال و ثبت خطایی می‌آمد (سهمیه، قفلِ شیت،
      // قطعیِ لحظه‌ای)، فایل از پوشهٔ منبع رفته بود ولی تحلیلش ثبت نشده بود —
      // هیچ دوری دیگر پیدایش نمی‌کرد و تحلیل برای همیشه از دست می‌رفت.
      const fileLink = createShareableLink(file.getId());
      analysisResult.File_Link = fileLink;

      writeAnalysisToSheet(sheet, analysisResult, "SUCCESS");

      // moveFileToArchive اینجا نگهبانِ try ندارد و شکستش به catch می‌رفت؛ حالا
      // که ثبت پیش از آن انجام شده، شکستِ انتقال نباید ردیفِ ERROR بی‌جا بسازد.
      try {
        moveFileToArchive(file, sourceFolder, archiveFolder);
      } catch (moveErr) {
        Logger.log(`⚠️ انتقال به بایگانی ناموفق (تحلیل ثبت شد): ${moveErr}`);
      }
      
      // آپدیت کش
      if (PROCESSED_FILE_IDS_CACHE) {
        PROCESSED_FILE_IDS_CACHE.push(file.getId());
      }
      
      Logger.log(`✅ موفق: ${file.getName()}`);
      Logger.log(`   نام جدید: ${analysisResult.New_File_Name}`);
      
      const musicInfo = formatMusicInfo(analysisResult);
      if (musicInfo !== "اطلاعات موسیقی یافت نشد") {
        Logger.log(`   🎵 موسیقی: ${musicInfo.split('\n')[0]}`);
      }
      
      successCount++;
      
    } catch (e) {
      errorCount++;
      const msg = e.toString();
      Logger.log(`❌ خطا: ${file.getName()} - ${msg}`);

      // توقفِ فوری وقتی کلید/دسترسیِ Gemini خراب است.
      // بی این، یک قطعیِ کلید تک‌تکِ فایل‌های صف را با خطا رد می‌کرد — و چون هر
      // شناسه‌ای که در شیت بنشیند «پردازش‌شده» است، همه برای همیشه پارک می‌شدند.
      // اینجا هیچ ردیفی نوشته نمی‌شود تا فایل‌ها دست‌نخورده بمانند.
      if (msg.indexOf('403') > -1 || msg.indexOf('401') > -1 ||
          msg.indexOf('API key') > -1 || msg.indexOf('PERMISSION_DENIED') > -1) {
        if (geminiFileId) { try { deleteFileFromGemini(geminiFileId); } catch (x) {} }
        Logger.log('🛑 توقف اضطراری: مشکل کلید API — هیچ ردیفی ثبت نشد تا فایل‌ها نسوزند.');
        throw new Error('🛑 توقف اضطراری: خطای احراز هویت Gemini — کلید را بررسی کنید');
      }

      writeErrorToSheet(sheet, file.getId(), file.getName(), msg);
    } finally {
      if (geminiFileId) {
        try {
          deleteFileFromGemini(geminiFileId);
        } catch (deleteError) {
          Logger.log(`⚠️ خطا در حذف: ${deleteError}`);
        }
      }
    }
  }

  Logger.log(`\n📊 گزارش دسته ${CURRENT_BATCH}:`);
  Logger.log(`   ✅ موفق: ${successCount}`);
  Logger.log(`   ❌ خطا: ${errorCount}`);
  Logger.log(`   📁 کل: ${filesToProcess.length}`);
  Logger.log(`   📦 فایل‌های سازماندهی شده در این مرحله: ${orgResult.moved}`);

  const remainingFiles = findUnprocessedVideoFilesFast().length;
  
  if (remainingFiles > 0) {
    Logger.log(`\n⏳ ${remainingFiles} فایل ویدیوی معتبر باقی مانده. راه‌اندازی دسته بعدی در ${DELAY_BETWEEN_BATCHES} ثانیه...`);
    scheduleNextBatch();
  } else {
    Logger.log("\n🎉 همه فایل‌های ویدیوی معتبر پردازش شدند! کار به پایان رسید.");
    cleanupTriggers();
    sendCompletionNotification(successCount, errorCount);
  }
}

// 🔄 تابع برای بررسی وضعیت فایل‌ها در پوشه مبدا
function checkSourceFolderStatus() {
  Logger.log("🔍 بررسی وضعیت پوشه مبدا...");
  
  const sourceFolder = DriveApp.getFolderById(SOURCE_FOLDER_ID);
  const files = sourceFolder.getFiles();
  
  let fileTypes = {
    valid_video: 0,
    invalid_video: 0,
    image: 0,
    audio: 0,
    document: 0,
    other: 0
  };
  
  while (files.hasNext()) {
    const file = files.next();
    const fileType = getFileType(file);
    fileTypes[fileType]++;
  }
  
  Logger.log(`
📊 وضعیت پوشه مبدا:
   🎯 ویدیوهای معتبر برای پردازش: ${fileTypes.valid_video}
   📹 ویدیوهای غیرمجاز: ${fileTypes.invalid_video}
   🖼️ تصاویر: ${fileTypes.image}
   🔊 فایل‌های صوتی: ${fileTypes.audio}
   📄 فایل‌های متنی: ${fileTypes.document}
   ❓ سایر فرمت‌ها: ${fileTypes.other}
  `);
  
  return fileTypes;
}

// 🔄 تابع برای سازماندهی دستی فایل‌ها
function manualOrganizeFiles() {
  Logger.log("🔧 سازماندهی دستی فایل‌ها...");
  return organizeFilesAutomatically();
}


// تنظیم تریگر برای دسته بعدی
function scheduleNextBatch() {
  try {
    // حذف تریگرهای قبلی برای جلوگیری از تداخل
    cleanupTriggers();
    
    // ایجاد تریگر جدید
    ScriptApp.newTrigger('processChainedBatch')
      .timeBased()
      .after(DELAY_BETWEEN_BATCHES * 1000) // میلی‌ثانیه
      .create();
    
    Logger.log(`✅ تریگر دسته بعدی تنظیم شد (${DELAY_BETWEEN_BATCHES} ثانیه دیگر)`);
  } catch (error) {
    Logger.log(`❌ خطا در تنظیم تریگر: ${error}`);
  }
}

// پاکسازی تریگرها
function cleanupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  let removedCount = 0;
  
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'processChainedBatch') {
      ScriptApp.deleteTrigger(trigger);
      removedCount++;
    }
  });
  
  if (removedCount > 0) {
    Logger.log(`🧹 ${removedCount} تریگر قدیمی پاک شد`);
  }
}

// ارسال نوتیفیکیشن پایان کار
function sendCompletionNotification(successCount, errorCount) {
  const total = successCount + errorCount;
  const message = `
🎉 پردازش کلی تمام شد!

📊 آمار نهایی:
   ✅ فایل‌های موفق: ${successCount}
   ❌ فایل‌های با خطا: ${errorCount}
   📁 کل فایل‌ها: ${total}
   🔄 تعداد دسته‌ها: ${CURRENT_BATCH}

⏰ زمان پایان: ${new Date().toLocaleString('fa-IR')}
  `;
  
  Logger.log(message);
  
  // بازنشانی شمارنده
  CURRENT_BATCH = 0;
}

// شروع پردازش زنجیره‌ای
function startChainedProcessing() {
  Logger.log("🚀 شروع پردازش زنجیره‌ای خودکار...");
  
  // پاکسازی کش قدیمی
  PROCESSED_FILE_IDS_CACHE = null;
  CACHE_TIMESTAMP = null;
  
  const unprocessedFiles = findUnprocessedVideoFilesFast();
  const totalFiles = unprocessedFiles.length;
  
  if (totalFiles === 0) {
    Logger.log("📭 هیچ فایل جدیدی برای پردازش پیدا نشد.");
    const processedIds = getAllProcessedFileIds();
    Logger.log(`📊 تاکنون ${processedIds.length} فایل پردازش شده است.`);
    return;
  }
  
  const estimatedBatches = Math.ceil(totalFiles / BATCH_SIZE);
  const estimatedTime = Math.ceil((estimatedBatches * (DELAY_BETWEEN_BATCHES + 120)) / 60);
  
  Logger.log(`
📋 برنامه پردازش:
   📁 فایل‌های جدید: ${totalFiles}
   📦 سایز دسته: ${BATCH_SIZE} فایل
   🔄 تعداد دسته‌های预估ی: ${estimatedBatches}
   ⏰ زمان تخمینی: ${estimatedTime} دقیقه
   ⏱️ فاصله بین دسته‌ها: ${DELAY_BETWEEN_BATCHES} ثانیه
  `);
  
  CURRENT_BATCH = 0;
  processChainedBatch();
}

// توقف پردازش زنجیره‌ای
function stopChainedProcessing() {
  Logger.log("🛑 توقف دستی پردازش زنجیره‌ای...");
  cleanupTriggers();
  CURRENT_BATCH = 0;
  Logger.log("✅ پردازش زنجیره‌ای متوقف شد");
}

// تابع موجود - تغییر نام دهید
function getDetailedProcessingStatus() {
  const triggers = ScriptApp.getProjectTriggers();
  const chainedTriggers = triggers.filter(t => t.getHandlerFunction() === 'processChainedBatch');
  
  const unprocessedFiles = findUnprocessedVideoFiles().length;
  const totalBatches = Math.ceil(unprocessedFiles / BATCH_SIZE);
  
  const sheet = SpreadsheetApp.openByUrl(SHEET_URL).getActiveSheet();
  const processedCount = sheet.getLastRow() - 1;
  
  const status = `
📊 وضعیت پردازش زنجیره‌ای:
   🔄 دسته جاری: ${CURRENT_BATCH}
   ✅ فایل‌های پردازش شده: ${processedCount}
   ⏳ فایل‌های جدید باقی‌مانده: ${unprocessedFiles}
   📦 دسته‌های预估ی باقی‌مانده: ${totalBatches}
   🔗 تریگرهای فعال: ${chainedTriggers.length}
   🕒 فاصله بین دسته‌ها: ${DELAY_BETWEEN_BATCHES} ثانیه
  `;
  
  Logger.log(status);
  return status;
}


// تابع برای تنظیم پارامترها
function configureChainedProcessing(batchSize = 3, delaySeconds = 30) {
  BATCH_SIZE = batchSize;
  DELAY_BETWEEN_BATCHES = delaySeconds;
  
  Logger.log(`
⚙️ پیکربندی پردازش زنجیره‌ای به‌روزرسانی شد:
   📦 سایز دسته: ${BATCH_SIZE}
   ⏱️ فاصله زمانی: ${DELAY_BETWEEN_BATCHES} ثانیه
  `);
}

// تابع برای پیدا کردن فایل‌های ویدیویی معتبر
function findValidVideoFiles() {
  const sourceFolder = DriveApp.getFolderById(SOURCE_FOLDER_ID);
  const validFiles = [];
  
  Logger.log("جستجوی فایل‌های ویدیویی معتبر:");
  
  const files = sourceFolder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const fileSize = file.getSize();
    const fileName = file.getName();
    
    if ((file.getMimeType().startsWith('video/') || 
         ['.mp4', '.mov', '.avi', '.mkv', '.webm'].some(ext => fileName.toLowerCase().endsWith(ext))) &&
        fileSize > 1000) {
      
      const fileSizeMB = fileSize / (1024 * 1024);
      
      if (fileSizeMB <= 20) {
        validFiles.push(file);
        Logger.log(`✓ فایل معتبر: ${fileName} (${fileSizeMB.toFixed(2)}MB)`);
      } else {
        Logger.log(`✗ فایل بزرگ: ${fileName} (${fileSizeMB.toFixed(2)}MB)`);
      }
    } else if (file.getMimeType().startsWith('video/') && fileSize <= 1000) {
      Logger.log(`✗ فایل خراب/خالی: ${fileName} (${fileSize} بایت)`);
    }
  }
  
  return validFiles;
}

// تابع آپلود اصلاح شده
function uploadFileToGemini(driveFile) {
  try {
    const blob = driveFile.getBlob();
    Logger.log(`آپلود فایل: ${driveFile.getName()} (${blob.getBytes().length} بایت)`);
    
    // ساخت multipart payload با روش قابل اطمینان
    const boundary = '----Boundary' + Utilities.getUuid();
    const metadata = {
      file: {
        displayName: driveFile.getName()
      }
    };

    const payload = Utilities.newBlob(
      '--' + boundary + '\r\n' +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) + '\r\n' +
      '--' + boundary + '\r\n' +
      'Content-Type: ' + blob.getContentType() + '\r\n\r\n'
    ).getBytes()
    .concat(blob.getBytes())
    .concat(Utilities.newBlob('\r\n--' + boundary + '--\r\n').getBytes());

    const options = {
      method: 'POST',
      contentType: 'multipart/form-data; boundary=' + boundary,
      payload: payload,
      muteHttpExceptions: true,
      headers: {
        'X-Goog-Upload-Protocol': 'multipart'
      }
    };

    const uploadUrlWithKey = `${UPLOAD_URL}&key=${API_KEY}`;
    const response = UrlFetchApp.fetch(uploadUrlWithKey, options);
    const responseText = response.getContentText();
    
    Logger.log(`پاسخ آپلود: ${response.getResponseCode()}`);
    
    if (response.getResponseCode() !== 200) {
      throw new Error(`آپلود فایل شکست خورد (${response.getResponseCode()}): ${responseText}`);
    }
    
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`پاسخ غیرمعتبر از سرور - JSON parse error: ${e.toString()}`);
    }
    
    // **تصحیح: File ID از file.name خوانده می‌شود**
    let fileId = null;
    if (jsonResponse.file && jsonResponse.file.name) {
      fileId = jsonResponse.file.name;
    } else if (jsonResponse.name) {
      fileId = jsonResponse.name; // برای سازگاری با ساختارهای قدیمی
    }
    
    if (!fileId) {
      Logger.log("ساختار پاسخ کامل: " + JSON.stringify(jsonResponse, null, 2));
      throw new Error("فایل آپلود شد اما File ID در پاسخ دریافت نشد. ساختار پاسخ: " + JSON.stringify(jsonResponse));
    }
    
    // بازگرداندن ساختار سازگار
    const result = {
      name: fileId,
      file: jsonResponse.file // نگهداری کل ساختار برای اطلاعات بیشتر
    };
    
    Logger.log(`آپلود موفق - File ID: ${fileId}`);
    return result;
    
  } catch (error) {
    Logger.log(`خطا در آپلود: ${error.toString()}`);
    throw error;
  }
}

function pollFileStatus(fileId) {
  // حذف پیشوند "files/" اگر وجود دارد
  const cleanFileId = fileId.replace(/^files\//, '');
  const GET_FILE_URL = `https://generativelanguage.googleapis.com/v1beta/files/${cleanFileId}?key=${API_KEY}`;
  
  Logger.log(`شروع نظرسنجی وضعیت برای فایل: ${cleanFileId}`);
  
  for (let i = 0; i < 15; i++) {
    try {
      Utilities.sleep(2000); // ابتدا صبر کنید
      
      const response = UrlFetchApp.fetch(GET_FILE_URL, { muteHttpExceptions: true });
      const responseText = response.getContentText();
      
      Logger.log(`نظرسنجی ${i+1}: کد ${response.getResponseCode()}`);
      
      if (response.getResponseCode() !== 200) {
        Logger.log(`خطا در دریافت وضعیت: ${responseText}`);
        if (i < 14) continue; // ادامه دادن در صورت خطای موقت
        throw new Error(`خطا در دریافت وضعیت فایل (${response.getResponseCode()}): ${responseText}`);
      }
      
      const fileStatus = JSON.parse(responseText);
      Logger.log(`وضعیت فایل: ${fileStatus.state}`);

      if (fileStatus.state === 'ACTIVE') {
        Logger.log(`فایل ${cleanFileId} فعال شد.`);
        return fileStatus;
      }
      if (fileStatus.state === 'FAILED') {
        throw new Error(`پردازش فایل جمینای با شکست مواجه شد: ${cleanFileId} - ${fileStatus.error?.message || 'Unknown error'}`);
      }
      
      Logger.log(`فایل ${cleanFileId} در حال پردازش... (${i+1} از 15)`);
      
    } catch (error) {
      Logger.log(`خطا در نظرسنجی وضعیت: ${error.message}`);
      if (i === 14) throw error;
    }
  }
  throw new Error(`زمان انتظار برای پردازش فایل ${cleanFileId} به پایان رسید.`);
}

function analyzeVideoContent(geminiFileId, driveFileId, driveFileName) {
  const generationConfig = {
    responseMimeType: "application/json",
    responseSchema: JSON_SCHEMA
  };

  const cleanFileId = geminiFileId.replace(/^files\//, '');
  const fileUri = `https://generativelanguage.googleapis.com/v1beta/files/${cleanFileId}`;

  const contents = [
    {
      parts: [
        {
          fileData: {
            mimeType: "video/mp4",
            fileUri: fileUri
          }
        },
        { text: USER_PROMPT }
      ]
    }
  ];
  
  const requestBody = {
    contents: contents,
    generationConfig: generationConfig,
    systemInstruction: SYSTEM_INSTRUCTION
  };

  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  };

  const generateUrlWithKey = `${GENERATE_URL}?key=${API_KEY}`;
  const response = UrlFetchApp.fetch(generateUrlWithKey, options);
  const responseText = response.getContentText();
  
  Logger.log(`پاسخ تحلیل: ${response.getResponseCode()}`);

  if (response.getResponseCode() !== 200) {
    throw new Error(`تحلیل جمینای با شکست مواجه شد (${response.getResponseCode()}): ${responseText}`);
  }

  let jsonResponse;
  try {
    jsonResponse = JSON.parse(responseText);
  } catch (parseError) {
    throw new Error(`پاسخ غیرمعتبر از مدل: ${responseText}`);
  }

  if (!jsonResponse.candidates || !jsonResponse.candidates[0]) {
    throw new Error(`پاسخ نامعتبر از مدل: ${responseText}`);
  }

  // وقتی مدل محتوا را رد می‌کند، candidate می‌آید ولی content/parts ندارد.
  // نگهبانِ بالا فقط candidates را می‌سنجید، پس دسترسیِ مستقیم کرش می‌کرد:
  //   TypeError: Cannot read properties of undefined (reading 'parts')
  // حالا علتِ واقعی (finishReason / blockReason) در پیام می‌آید تا در شیت
  // معلوم باشد فایل چرا رد شد.
  const cand = jsonResponse.candidates[0];
  if (!cand.content || !cand.content.parts || !cand.content.parts[0] ||
      typeof cand.content.parts[0].text !== 'string') {
    const why = cand.finishReason ||
                (jsonResponse.promptFeedback && jsonResponse.promptFeedback.blockReason) ||
                'نامعلوم';
    throw new Error(`مدل محتوایی برنگرداند (علت: ${why}) — پاسخ: ${String(responseText).substring(0, 300)}`);
  }

  const rawJsonText = cand.content.parts[0].text.trim();
  
  try {
    const parsedResponse = JSON.parse(rawJsonText);
    const analysisData = parsedResponse.AnalysisResult;
    
    // تزریق شناسه و نام فایل درایو
    analysisData.File_ID = driveFileId;
    analysisData.File_Name = driveFileName;

    return analysisData;
  } catch (e) {
    throw new Error(`خطا در تجزیه خروجی JSON مدل: ${e.toString()}. متن خام: ${rawJsonText}`);
  }
}

function writeAnalysisToSheet(sheet, data, status) {
  const newRow = [
    new Date(), // تاریخ پردازش
    data.File_ID || '',
    data.File_Name || '', // نام اصلی
    data.New_File_Name || '', // نام جدید
    data.File_Link || '', // لینک دسترسی
    
    // اطلاعات اشخاص
    data.Persons_Identified ? JSON.stringify(data.Persons_Identified) : '[]',
    
    // 🎵 تحلیل موسیقی
    data.Music_Analysis ? JSON.stringify(data.Music_Analysis) : '{}',
    
    // اطلاعات زمانی
    data.Video_Date_Info ? JSON.stringify(data.Video_Date_Info) : '{}',
    
    // سایر فیلدها
    data.Farsi_Transcription || '',
    data.Vibe_Atmosphere || '',
    data.Expert_Analysis || '',
    data.Technical_Specs ? JSON.stringify(data.Technical_Specs) : '',
    data.Content_Analysis ? JSON.stringify(data.Content_Analysis) : '',
    data.Audio_Analysis || '',
    data.Visual_Analysis || '',
    data.Professional_Insights || '',
    data.Executive_Summary || '',
    
    status
  ];
  
  sheet.appendRow(newRow);
}

function writeErrorToSheet(sheet, fileId, fileName, errorMessage) {
  const errorRow = [
    new Date(),
    fileId,
    fileName,
    '', // New_File_Name
    '', // File_Link
    '[]', // Persons_Identified
    '{}', // Music_Analysis
    '{}', // Video_Date_Info
    '', // Farsi_Transcription
    '', // Vibe_Atmosphere
    '', // Expert_Analysis
    '', // Technical_Specs
    '', // Content_Analysis
    '', // Audio_Analysis
    '', // Visual_Analysis
    '', // Professional_Insights
    '', // Executive_Summary
    'ERROR: ' + errorMessage.substring(0, 100)
  ];
  sheet.appendRow(errorRow);
}

function setupSheetHeaders() {
  const sheet = SpreadsheetApp.openByUrl(SHEET_URL).getActiveSheet();

  // نگهبانِ داده: این تابع کلِ شیت را پاک می‌کند و برای شیتِ *خالی* نوشته شده.
  // از منو در دسترس نیست، ولی از فهرستِ توابعِ ویرایشگر یک کلیک فاصله دارد و
  // اجرای اشتباهی‌اش یعنی نابودیِ همهٔ تحلیل‌های ثبت‌شده. اگر شیت ردیفِ داده
  // دارد، دست نگه می‌دارد.
  const existingRows = sheet.getLastRow() - 1;
  if (existingRows > 0) {
    const m = `⛔ لغو شد: شیت ${existingRows} ردیفِ داده دارد و setupSheetHeaders آن‌ها را پاک می‌کرد.`;
    Logger.log(m);
    throw new Error(m);
  }
  
  const headers = [
    'تاریخ پردازش',
    'File ID',
    'نام اصلی فایل', 
    'نام جدید فایل',
    'لینک دسترسی',
    'اشخاص شناسایی شده (JSON)',
    '🎵 تحلیل موسیقی (JSON)', // ستون جدید
    'اطلاعات زمانی (JSON)',
    'متن پیاده‌سازی شده',
    'فضا و وایب',
    'تحلیل تخصصی',
    'مشخصات فنی (JSON)',
    'تحلیل محتوا (JSON)',
    'تحلیل صوتی',
    'تحلیل بصری',
    'نکات حرفه‌ای',
    'خلاصه اجرایی',
    'وضعیت'
  ];
  
  // پاک کردن شیت اگر قبلاً داده دارد
  sheet.clear();
  
  // اضافه کردن سرستون‌ها
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // فرمت‌دهی سرستون‌ها
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#4a86e8')
    .setFontColor('white')
    .setFontWeight('bold');
  
  // تنظیم عرض ستون‌ها
  sheet.setColumnWidth(4, 200); // نام جدید فایل
  sheet.setColumnWidth(5, 300); // لینک دسترسی
  sheet.setColumnWidth(7, 250); // تحلیل موسیقی (عرض بیشتر)
  sheet.setColumnWidth(9, 150); // متن پیاده‌سازی شده
  
  Logger.log("✅ سرستون‌های شیت با موفقیت ایجاد شدند");
}

// بررسی و به‌روزرسانی خودکار سرستون‌ها
function ensureSheetHeaders() {
  const sheet = SpreadsheetApp.openByUrl(SHEET_URL).getActiveSheet();
  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const expectedHeaders = [
    'تاریخ پردازش',
    'File ID', 
    'نام فایل',
    'متن پیاده‌سازی شده',
    'فضا و وایب',
    'تحلیل تخصصی',
    'مشخصات فنی (JSON)',
    'تحلیل محتوا (JSON)',
    'تحلیل صوتی',
    'تحلیل بصری',
    'نکات حرفه‌ای',
    'خلاصه اجرایی',
    'وضعیت'
  ];
  
  // اگر سرستون‌ها متفاوت هستند، به‌روزرسانی کن
  if (JSON.stringify(currentHeaders) !== JSON.stringify(expectedHeaders)) {
    Logger.log("سرستون‌ها به‌روز نیستند، در حال به‌روزرسانی...");
    setupSheetHeaders();
  } else {
    Logger.log("✅ سرستون‌ها به‌روز هستند");
  }
}

// ── تعریفِ کهنه و تکراریِ writeErrorToSheet اینجا بود و حذف شد ──
// دو تابعِ هم‌نام وجود داشت و در جاوااسکریپت تعریفِ دوم برنده می‌شود، پس همین
// نسخهٔ کهنه فعال بود: فقط ۱۳ ستون می‌نوشت در حالی که شیت ۱۸ ستون دارد.
// نتیجه‌اش این بود که «ERROR: …» در اندیسِ ۱۲ (ستونِ «تحلیل محتوا») می‌نشست،
// ستونِ «وضعیت» (اندیسِ ۱۷) خالی می‌ماند، و پنج ستونِ «نام جدید»، «لینک»،
// «اشخاص»، «موسیقی» و «اطلاعات زمانی» جا می‌افتادند و بقیهٔ داده یک خانه
// جابه‌جا می‌شد. نسخهٔ درستِ ۱۸ ستونی بالاتر هست و می‌ماند.


// تابع کمکی برای فرمت‌دهی بهتر اطلاعات موسیقی
function formatMusicInfo(analysisData) {
  if (!analysisData.Music_Analysis) {
    return "اطلاعات موسیقی یافت نشد";
  }
  
  const music = analysisData.Music_Analysis;
  let info = "";
  
  if (music.Identified_Tracks && music.Identified_Tracks.length > 0) {
    info += "🎵 آهنگ‌های شناسایی شده:\n";
    music.Identified_Tracks.forEach((track, index) => {
      info += `${index + 1}. "${track.Track_Name}" - ${track.Artist} (${track.Genre})\n`;
    });
  }
  
  if (music.Music_Genre) {
    info += `\n🎼 ژانر موسیقی: ${music.Music_Genre}`;
  }
  
  if (music.Quality_Assessment) {
    info += `\n⭐ کیفیت: ${music.Quality_Assessment}`;
  }
  
  return info || "هیچ اطلاعات موسیقی شناسایی نشد";
}

function moveFileToArchive(file, sourceFolder, archiveFolder) {
  sourceFolder.removeFile(file);
  archiveFolder.addFile(file);
  Logger.log(`فایل ${file.getName()} با موفقیت به بایگانی منتقل شد.`);
}

function deleteFileFromGemini(geminiFileId) {
  try {
    // **تصحیح: استفاده از File ID بدون پیشوند "files/"**
    const cleanFileId = geminiFileId.replace(/^files\//, '');
    const DELETE_URL = `https://generativelanguage.googleapis.com/v1beta/files/${cleanFileId}?key=${API_KEY}`;
    
    const options = {
      method: 'DELETE',
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(DELETE_URL, options);
    
    if (response.getResponseCode() === 200) {
      Logger.log(`فایل جمینای ${cleanFileId} حذف شد.`);
    } else {
      Logger.log(`خطا در حذف فایل جمینای ${cleanFileId}: ${response.getContentText()}`);
    }
  } catch (error) {
    Logger.log(`خطا در حذف فایل جمینای: ${error.message}`);
  }
}

function generatePersianFileName(analysisData, originalName) {
  try {
    const now = new Date();
    const timestamp = Utilities.formatDate(now, 'Asia/Tehran', 'yyyyMMdd-HHmm');
    
    // استخراج اطلاعات کلیدی از تحلیل
    const mainTopic = analysisData.Content_Analysis?.Main_Topic || 'ویدیو';
    const vibe = analysisData.Vibe_Atmosphere ? analysisData.Vibe_Atmosphere.split(' ')[0] : 'تحلیل‌شده';
    
    // 🎵 استفاده از اطلاعات موسیقی در نام فایل
    let musicInfo = '';
    if (analysisData.Music_Analysis?.Identified_Tracks && analysisData.Music_Analysis.Identified_Tracks.length > 0) {
      const firstTrack = analysisData.Music_Analysis.Identified_Tracks[0];
      musicInfo = `_موسیقی_${firstTrack.Artist || firstTrack.Track_Name || 'موسیقی'}`;
    } else if (analysisData.Music_Analysis?.Music_Genre) {
      musicInfo = `_${analysisData.Music_Analysis.Music_Genre}`;
    }
    
    // ایجاد نام معنادار
    let newName = `ویدیو_${mainTopic}_${vibe}${musicInfo}`;
    
    // اضافه کردن اطلاعات اشخاص اگر وجود دارند
    if (analysisData.Persons_Identified && analysisData.Persons_Identified.length > 0) {
      const persons = analysisData.Persons_Identified.slice(0, 2).map(p => p.Name).join('_');
      newName += `_با_${persons}`;
    }
    
    // اضافه کردن timestamp برای یکتایی
    newName += `_${timestamp}`;
    
    // حذف کاراکترهای نامعتبر
    newName = newName.replace(/[<>:"/\\|?*]/g, '_');
    
    // حفظ پسوند فایل
    const fileExtension = originalName.split('.').pop();
    
    return `${newName}.${fileExtension}`;
  } catch (error) {
    Logger.log(`خطا در تولید نام جدید: ${error}`);
    return originalName;
  }
}

// تابع برای تغییر نام فایل در درایو
function renameFileInDrive(fileId, newName) {
  try {
    const file = DriveApp.getFileById(fileId);
    const oldName = file.getName();
    file.setName(newName);
    Logger.log(`✅ تغییر نام فایل: "${oldName}" → "${newName}"`);
    return newName;
  } catch (error) {
    Logger.log(`❌ خطا در تغییر نام فایل ${fileId}: ${error}`);
    return null;
  }
}

// تابع برای ایجاد لینک قابل اشتراک‌گذاری
function createShareableLink(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    
    // تنظیم دسترسی به "هرکس با لینک می‌تواند مشاهده کند"
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const link = file.getUrl();
    Logger.log(`✅ لینک دسترسی ایجاد شد: ${link}`);
    return link;
  } catch (error) {
    Logger.log(`❌ خطا در ایجاد لینک برای فایل ${fileId}: ${error}`);
    return 'لینک در دسترس نیست';
  }
}

// 🔧 تابع بهینه‌شده برای دریافت فایل‌های پردازش شده
function getAllProcessedFileIds() {
  const now = new Date().getTime();
  
  if (PROCESSED_FILE_IDS_CACHE && CACHE_TIMESTAMP && (now - CACHE_TIMESTAMP) < CACHE_DURATION) {
    return PROCESSED_FILE_IDS_CACHE;
  }
  
  try {
    const sheet = SpreadsheetApp.openByUrl(SHEET_URL).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    const processedIds = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1]) {
        processedIds.push(data[i][1]);
      }
    }
    
    PROCESSED_FILE_IDS_CACHE = processedIds;
    CACHE_TIMESTAMP = now;
    
    Logger.log(`📊 ${processedIds.length} فایل پردازش شده در کش ذخیره شد`);
    return processedIds;
  } catch (error) {
    Logger.log(`⚠️ خطا در خواندن شیت: ${error}`);
    return [];
  }
}

// 🔄 تابع جایگزین برای findUnprocessedVideoFilesFast (با پشتیبانی از زیرپوشه‌ها)
function findUnprocessedVideoFilesFast() {
  const startTime = new Date().getTime();
  const unprocessedFiles = [];
  
  const processedIds = getAllProcessedFileIds();
  const processedSet = new Set(processedIds);
  
  Logger.log(`🔍 جستجوی فایل‌های جدید در کل ساختار پوشه... (${processedIds.length} فایل پردازش شده)`);
  
  const allVideoFiles = findAllVideoFilesRecursively();
  let validCount = 0;
  
  allVideoFiles.forEach(file => {
    const fileId = file.getId();
    if (!processedSet.has(fileId)) {
      unprocessedFiles.push(file);
      validCount++;
    }
  });
  
  const duration = new Date().getTime() - startTime;
  Logger.log(`✅ جستجو کامل: ${allVideoFiles.length} فایل ویدیویی یافت شد، ${validCount} جدید (${duration}ms)`);
  
  return unprocessedFiles;
}

// تابع تست آپلود
function testUploadSingleFile() {
  const validFiles = findValidVideoFiles();
  if (validFiles.length === 0) {
    Logger.log("هیچ فایل معتبری برای تست یافت نشد.");
    return;
  }
  
  const testFile = validFiles[0];
  Logger.log(`تست آپلود فایل: ${testFile.getName()}`);
  
  try {
    const result = uploadFileToGemini(testFile);
    Logger.log(`✅ تست موفق - File ID: ${result.name}`);
    
    // حذف فایل تست
    if (result.name) {
      deleteFileFromGemini(result.name);
    }
    
    return result;
  } catch (e) {
    Logger.log(`❌ تست ناموفق: ${e.toString()}`);
    return null;
  }
}

// تابع دیباگ
function debugUploadResponse() {
  const validFiles = findValidVideoFiles();
  if (validFiles.length === 0) {
    Logger.log("هیچ فایل معتبری برای دیباگ یافت نشد.");
    return;
  }
  
  const testFile = validFiles[0];
  Logger.log(`دیباگ آپلود فایل: ${testFile.getName()}`);
  
  // فقط آپلود کنید و پاسخ کامل را بررسی کنید
  const blob = testFile.getBlob();
  const boundary = '----Boundary' + Utilities.getUuid();
  const metadata = {
    file: {
      displayName: testFile.getName()
    }
  };

  const payload = Utilities.newBlob(
    '--' + boundary + '\r\n' +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) + '\r\n' +
    '--' + boundary + '\r\n' +
    'Content-Type: ' + blob.getContentType() + '\r\n\r\n'
  ).getBytes()
  .concat(blob.getBytes())
  .concat(Utilities.newBlob('\r\n--' + boundary + '--\r\n').getBytes());

  const options = {
    method: 'POST',
    contentType: 'multipart/form-data; boundary=' + boundary,
    payload: payload,
    muteHttpExceptions: true
  };

  const uploadUrlWithKey = `${UPLOAD_URL}&key=${API_KEY}`;
  const response = UrlFetchApp.fetch(uploadUrlWithKey, options);
  
  Logger.log("=== دیباگ پاسخ آپلود ===");
  Logger.log(`کد وضعیت: ${response.getResponseCode()}`);
  Logger.log(`متن پاسخ: ${response.getContentText()}`);
  Logger.log(`هدرها: ${JSON.stringify(response.getHeaders())}`);
  Logger.log("=== پایان دیباگ ===");
}

//-----------------------------------------------------------
// 🔄 تابع برای شناسایی نوع فایل
function getFileType(file) {
  const fileName = file.getName().toLowerCase();
  const mimeType = file.getMimeType();
  
  // بررسی فایل‌های تصویری
  if (mimeType.startsWith('image/') || IMAGE_FORMATS.some(ext => fileName.endsWith(ext))) {
    return 'image';
  }
  
  // بررسی فایل‌های ویدیویی
  if (mimeType.startsWith('video/') || ALLOWED_VIDEO_FORMATS.some(ext => fileName.endsWith(ext))) {
    const fileSizeMB = file.getSize() / (1024 * 1024);
    // ویدیوی معتبر برای پردازش باید حجم کمتر از 20MB داشته باشد
    if (fileSizeMB <= MAX_VIDEO_SIZE_MB && file.getSize() > 1000) {
      return 'valid_video'; // ویدیوی مجاز برای پردازش
    } else {
      return 'invalid_video'; // ویدیوی غیرمجاز
    }
  }
  
  // بررسی فایل‌های صوتی
  if (mimeType.startsWith('audio/') || AUDIO_FORMATS.some(ext => fileName.endsWith(ext))) {
    return 'audio';
  }
  
  // بررسی فایل‌های متنی
  if (mimeType.startsWith('text/') || 
      mimeType.includes('pdf') || 
      mimeType.includes('document') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('presentation') ||
      DOCUMENT_FORMATS.some(ext => fileName.endsWith(ext))) {
    return 'document';
  }
  
  return 'other';
}

// 🔄 تابع برای انتقال فایل به پوشه مناسب
function moveFileToAppropriateFolder(file) {
  try {
    const fileType = getFileType(file);
    let targetFolderId = null;
    
    switch (fileType) {
      case 'valid_video':
        // فایل ویدیوی معتبر در پوشه مبدا باقی می‌ماند برای پردازش
        Logger.log(`🎯 فایل ویدیوی معتبر برای پردازش: ${file.getName()}`);
        return 'stay'; // در پوشه مبدا باقی بماند
        
      case 'invalid_video':
        targetFolderId = FOLDER_MAPPING.invalid_video;
        break;
        
      case 'image':
        targetFolderId = FOLDER_MAPPING.image;
        break;
        
      case 'audio':
        targetFolderId = FOLDER_MAPPING.audio;
        break;
        
      case 'document':
        targetFolderId = FOLDER_MAPPING.document;
        break;
        
      default:
        targetFolderId = FOLDER_MAPPING.other;
        break;
    }
    
    if (targetFolderId) {
      const sourceFolder = DriveApp.getFolderById(SOURCE_FOLDER_ID);
      const targetFolder = DriveApp.getFolderById(targetFolderId);
      
      // انتقال فایل
      sourceFolder.removeFile(file);
      targetFolder.addFile(file);
      
      Logger.log(`📦 فایل "${file.getName()}" به پوشه ${fileType} منتقل شد`);
      return 'moved';
    }
    
    return 'unknown';
    
  } catch (error) {
    Logger.log(`❌ خطا در انتقال فایل ${file.getName()}: ${error}`);
    return 'error';
  }
}

// 🔄 تابع برای سازماندهی خودکار فایل‌ها (نسخه پیشرفته با پیمایش زیرپوشه‌ها)
function organizeFilesAutomatically() {
  Logger.log("🔍 شروع سازماندهی خودکار فایل‌ها (شامل زیرپوشه‌ها)...");
  
  const sourceFolder = DriveApp.getFolderById(SOURCE_FOLDER_ID);
  
  let movedCount = 0;
  let stayCount = 0;
  let errorCount = 0;
  
  // پردازش بازگشتی تمام فایل‌ها و زیرپوشه‌ها
  const processFolder = (folder) => {
    // پردازش تمام فایل‌های مستقیم در این پوشه
    const files = folder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      const result = moveFileToAppropriateFolder(file);
      
      switch (result) {
        case 'moved':
          movedCount++;
          break;
        case 'stay':
          stayCount++;
          break;
        case 'error':
          errorCount++;
          break;
      }
    }
    
    // پردازش بازگشتی تمام زیرپوشه‌ها
    const subFolders = folder.getFolders();
    while (subFolders.hasNext()) {
      const subFolder = subFolders.next();
      Logger.log(`📂 پیمایش زیرپوشه: ${subFolder.getName()}`);
      processFolder(subFolder); // پردازش بازگشتی
    }
  };
  
  // شروع پردازش از پوشه مبدا
  processFolder(sourceFolder);
  
  Logger.log(`
📊 گزارش سازماندهی (شامل زیرپوشه‌ها):
   📦 فایل‌های منتقل شده: ${movedCount}
   🎯 فایل‌های باقی‌مانده برای پردازش: ${stayCount}
   ❌ خطاها: ${errorCount}
  `);
  
  return {
    moved: movedCount,
    stay: stayCount,
    error: errorCount
  };
}

// 🔄 تابع کمکی برای پیدا کردن فایل‌های ویدیویی در کل ساختار پوشه
function findAllVideoFilesRecursively() {
  const sourceFolder = DriveApp.getFolderById(SOURCE_FOLDER_ID);
  const videoFiles = [];
  
  const findVideosInFolder = (folder) => {
    // فایل‌های ویدیویی در این پوشه
    const files = folder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      const fileType = getFileType(file);
      if (fileType === 'valid_video') {
        videoFiles.push(file);
      }
    }
    
    // جستجو در زیرپوشه‌ها
    const subFolders = folder.getFolders();
    while (subFolders.hasNext()) {
      const subFolder = subFolders.next();
      findVideosInFolder(subFolder);
    }
  };
  
  findVideosInFolder(sourceFolder);
  return videoFiles;
}

//-----------------------------------------------------------
function restartProcessing() {
  Logger.log("🔄 راه‌اندازی مجدد سیستم...");
  
  // توقف هرگونه پردازش قبلی
  stopChainedProcessing();
  
  // پاکسازی کش
  PROCESSED_FILE_IDS_CACHE = null;
  CACHE_TIMESTAMP = null;
  
  // راه‌اندازی مجدد
  startChainedProcessing();
}

function checkSystemStatus() {
  Logger.log("🔍 بررسی وضعیت سیستم...");
  
  const sheet = SpreadsheetApp.openByUrl(SHEET_URL).getActiveSheet();
  const processedCount = sheet.getLastRow() - 1;
  
  const sourceFolder = DriveApp.getFolderById(SOURCE_FOLDER_ID);
  const sourceFiles = sourceFolder.getFiles();
  let sourceCount = 0;
  while (sourceFiles.hasNext()) {
    sourceFiles.next();
    sourceCount++;
  }
  
  const archiveFolder = DriveApp.getFolderById(ARCHIVE_FOLDER_ID);
  const archiveFiles = archiveFolder.getFiles();
  let archiveCount = 0;
  while (archiveFiles.hasNext()) {
    archiveFiles.next();
    archiveCount++;
  }
  
  const triggers = ScriptApp.getProjectTriggers();
  
  const status = `
📊 گزارش وضعیت سیستم:

📁 پوشه مبدا: ${sourceCount} فایل
📂 پوشه آرشیو: ${archiveCount} فایل
✅ فایل‌های پردازش شده: ${processedCount}
🔗 تریگرهای فعال: ${triggers.length}
🔄 دسته جاری: ${CURRENT_BATCH}

💡 اقدامات:
${sourceCount > 0 ? '• فایل‌های جدید موجود است' : '• فایل جدیدی وجود ندارد'}
${triggers.length > 0 ? '• پردازش در حال اجراست' : '• پردازش متوقف شده'}
  `;
  
  Logger.log(status);
  return status;
}

function testAPIConnection() {
  Logger.log("🧪 تست اتصال API...");
  
  try {
    // تست کلید API
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error("کلید API یافت نشد");
    }
    Logger.log("✅ کلید API موجود است");
    
    // تست دسترسی به شیت
    const sheet = SpreadsheetApp.openByUrl(SHEET_URL);
    Logger.log("✅ دسترسی به شیت OK");
    
    // تست دسترسی به درایو
    DriveApp.getFolderById(SOURCE_FOLDER_ID);
    Logger.log("✅ دسترسی به درایو OK");
    
    // تست ساده آپلود
    const testFiles = findValidVideoFiles();
    if (testFiles.length > 0) {
      Logger.log(`✅ ${testFiles.length} فایل معتبر پیدا شد`);
    } else {
      Logger.log("⚠️ هیچ فایل معتبری برای تست یافت نشد");
    }
    
    return "✅ همه تست‌ها موفق بودند";
    
  } catch (error) {
    Logger.log(`❌ خطا در تست سلامت: ${error.toString()}`);
    return `❌ خطا: ${error.toString()}`;
  }
}

function resumeProcessing() {
  Logger.log("▶️ ادامه پردازش از نقطه توقف...");
  
  // بررسی وضعیت فعلی
  const unprocessedFiles = findUnprocessedVideoFilesFast();
  const totalProcessed = getAllProcessedFileIds().length;
  
  Logger.log(`
📋 وضعیت فعلی:
   📊 کل پردازش شده: ${totalProcessed}
   ⏳ باقی مانده: ${unprocessedFiles.length}
   🔄 دسته قبلی: ${CURRENT_BATCH}
  `);
  
  if (unprocessedFiles.length === 0) {
    Logger.log("🎉 همه فایل‌ها قبلاً پردازش شده‌اند!");
    return;
  }
  
  // راه‌اندازی مجدد
  startChainedProcessing();
}

//------------------------------------------------------

function findProcessedFilesInSource() {
  Logger.log("🔍 بررسی فایل‌های پردازش شده در پوشه مبدا...");
  
  const processedIds = getAllProcessedFileIds();
  const processedSet = new Set(processedIds);
  const sourceFolder = DriveApp.getFolderById(SOURCE_FOLDER_ID);
  
  const files = sourceFolder.getFiles();
  let processedInSource = [];
  let unprocessedInSource = [];
  let totalChecked = 0;
  
  while (files.hasNext()) {
    const file = files.next();
    totalChecked++;
    
    if (processedSet.has(file.getId())) {
      processedInSource.push({
        name: file.getName(),
        id: file.getId(),
        size: file.getSize()
      });
    } else {
      unprocessedInSource.push({
        name: file.getName(),
        id: file.getId(), 
        size: file.getSize()
      });
    }
    
    if (totalChecked % 100 === 0) {
      Logger.log(`📊 ${totalChecked} فایل بررسی شد...`);
    }
  }
  
  Logger.log(`
📋 نتایج بررسی:
   📁 کل فایل‌های بررسی شده: ${totalChecked}
   ✅ فایل‌های پردازش شده در مبدا: ${processedInSource.length}
   ❓ فایل‌های پردازش نشده در مبدا: ${unprocessedInSource.length}
  `);
  
  if (processedInSource.length > 0) {
    Logger.log("🗑️ فایل‌های پردازش شده در پوشه مبدا (نیاز به پاکسازی):");
    processedInSource.slice(0, 10).forEach(file => {
      Logger.log(`   📄 ${file.name} (${file.id})`);
    });
  }
  
  return {
    processed: processedInSource,
    unprocessed: unprocessedInSource
  };
}

function cleanupProcessedFiles() {
  Logger.log("🧹 پاکسازی فایل‌های پردازش شده از پوشه مبدا...");
  
  const result = findProcessedFilesInSource();
  const processedFiles = result.processed;
  
  if (processedFiles.length === 0) {
    Logger.log("✅ هیچ فایل پردازش شده‌ای در پوشه مبدا وجود ندارد");
    return;
  }
  
  Logger.log(`🗑️ در حال حذف ${processedFiles.length} فایل پردازش شده...`);
  let deletedCount = 0;
  let errorCount = 0;
  
  processedFiles.forEach(file => {
    try {
      const driveFile = DriveApp.getFileById(file.id);
      driveFile.setTrashed(true); // انتقال به سطل بازیافت
      deletedCount++;
      
      if (deletedCount % 50 === 0) {
        Logger.log(`📊 ${deletedCount} فایل حذف شد...`);
      }
    } catch (error) {
      errorCount++;
      Logger.log(`❌ خطا در حذف ${file.name}: ${error}`);
    }
  });
  
  Logger.log(`
🎉 پاکسازی کامل شد:
   ✅ حذف شده: ${deletedCount}
   ❌ خطا: ${errorCount}
   📊 کل: ${processedFiles.length}
  `);
}

function deepCheckUnprocessedFiles() {
  Logger.log("🔍 بررسی عمیق فایل‌های پردازش نشده...");
  
  const processedIds = getAllProcessedFileIds();
  const processedSet = new Set(processedIds);
  const sourceFolder = DriveApp.getFolderById(SOURCE_FOLDER_ID);
  
  const files = sourceFolder.getFiles();
  let unprocessedDetails = [];
  let total = 0;
  
  while (files.hasNext()) {
    const file = files.next();
    total++;
    
    if (!processedSet.has(file.getId())) {
      const fileSizeMB = file.getSize() / (1024 * 1024);
      
      // بررسی معیارهای فایل ویدیویی
      const isValidVideo = (
        file.getMimeType().startsWith('video/') || 
        ['.mp4', '.mov', '.avi', '.mkv', '.webm'].some(ext => 
          file.getName().toLowerCase().endsWith(ext)
        )
      ) && file.getSize() > 1000 && fileSizeMB <= 20;
      
      unprocessedDetails.push({
        name: file.getName(),
        id: file.getId(),
        size: file.getSize(),
        sizeMB: fileSizeMB.toFixed(2),
        mimeType: file.getMimeType(),
        isValid: isValidVideo,
        reason: !isValidVideo ? 
          (fileSizeMB > 20 ? 'حجم زیاد' : 
           file.getSize() <= 1000 ? 'حجم کم' : 
           'فرمت نامعتبر') : 'معتبر'
      });
    }
  }
  
  const validUnprocessed = unprocessedDetails.filter(f => f.isValid);
  const invalidUnprocessed = unprocessedDetails.filter(f => !f.isValid);
  
  Logger.log(`
📊 نتایج بررسی عمیق:
   📁 کل فایل‌ها در مبدا: ${total}
   ✅ فایل‌های پردازش نشده معتبر: ${validUnprocessed.length}
   ❌ فایل‌های پردازش نشده نامعتبر: ${invalidUnprocessed.length}
  `);
  
  if (validUnprocessed.length > 0) {
    Logger.log("🎯 فایل‌های معتبر برای پردازش:");
    validUnprocessed.slice(0, 5).forEach(file => {
      Logger.log(`   📹 ${file.name} (${file.sizeMB}MB)`);
    });
  }
  
  if (invalidUnprocessed.length > 0) {
    Logger.log("⚠️ فایل‌های نامعتبر:");
    invalidUnprocessed.slice(0, 5).forEach(file => {
      Logger.log(`   ❌ ${file.name} (${file.reason})`);
    });
  }
  
  return {
    valid: validUnprocessed,
    invalid: invalidUnprocessed
  };
}

function fullRestart() {
  Logger.log("🔄 راه‌اندازی کامل سیستم...");
  
  // ۱. بررسی وضعیت
  const deepCheck = deepCheckUnprocessedFiles();
  
  if (deepCheck.valid.length === 0) {
    Logger.log("❌ هیچ فایل معتبری برای پردازش یافت نشد");
    return;
  }
  
  // ۲. پاکسازی فایل‌های پردازش شده
  cleanupProcessedFiles();
  
  // ۳. راه‌اندازی مجدد
  Utilities.sleep(5000); // تأخیر برای به‌روزرسانی کش
  
  // پاکسازی کش
  PROCESSED_FILE_IDS_CACHE = null;
  CACHE_TIMESTAMP = null;
  
  // راه‌اندازی پردازش
  startChainedProcessing();
}

// توابع جدید برای پشتیبانی از فرانت اند - نسخه اصلاح شده
function getFrontendStatus() {
  try {
    const sheet = SpreadsheetApp.openByUrl(SHEET_URL).getActiveSheet();
    const processedCount = sheet.getLastRow() - 1;
    
    const unprocessedFiles = findUnprocessedVideoFilesFast();
    const activeTriggers = ScriptApp.getProjectTriggers().filter(t => 
      t.getHandlerFunction() === 'processChainedBatch'
    ).length;
    
    // شمارش خطاها از شیت
    const data = sheet.getDataRange().getValues();
    let errorCount = 0;
    for (let i = 1; i < data.length; i++) {
      const status = data[i][data[i].length - 1];
      if (status && status.includes('ERROR')) {
        errorCount++;
      }
    }
    
    return {
      active: activeTriggers,
      completed: processedCount,
      queued: unprocessedFiles.length,
      errors: errorCount,
      currentBatch: CURRENT_BATCH,
      batchSize: BATCH_SIZE,
      batchDelay: DELAY_BETWEEN_BATCHES
    };
  } catch (error) {
    Logger.log(`خطا در getFrontendStatus: ${error}`);
    return {
      active: 0,
      completed: 0,
      queued: 0,
      errors: 0,
      currentBatch: 0,
      batchSize: BATCH_SIZE,
      batchDelay: DELAY_BETWEEN_BATCHES
    };
  }
}

function getFrontendPrompts() {
  return {
    system: SYSTEM_INSTRUCTION.parts[0].text,
    user: USER_PROMPT
  };
}

function saveFrontendPrompts(systemPrompt, userPrompt) {
  try {
    // ذخیره در PropertiesService برای پایداری
    PropertiesService.getScriptProperties().setProperties({
      'SYSTEM_PROMPT': systemPrompt,
      'USER_PROMPT': userPrompt
    });
    
    // به‌روزرسانی متغیرهای جهانی
    SYSTEM_INSTRUCTION.parts[0].text = systemPrompt;
    USER_PROMPT = userPrompt;
    
    return { success: true, message: 'پرامپت‌ها با موفقیت ذخیره شدند' };
  } catch (error) {
    return { success: false, message: `خطا در ذخیره پرامپت‌ها: ${error}` };
  }
}

function getFrontendSettings() {
  return {
    sourceFolder: SOURCE_FOLDER_ID,
    archiveFolder: ARCHIVE_FOLDER_ID,
    batchSize: BATCH_SIZE,
    batchDelay: DELAY_BETWEEN_BATCHES,
    modelName: MODEL_NAME,
    cacheDuration: CACHE_DURATION,
    maxVideoSize: MAX_VIDEO_SIZE_MB
  };
}

function saveFrontendSettings(settings) {
  try {
    // اعتبارسنجی تنظیمات
    if (!settings.sourceFolder || !settings.archiveFolder) {
      return { success: false, message: 'شناسه پوشه‌ها الزامی است' };
    }
    
    // ذخیره تنظیمات در PropertiesService
    PropertiesService.getScriptProperties().setProperties({
      'SOURCE_FOLDER': settings.sourceFolder,
      'ARCHIVE_FOLDER': settings.archiveFolder,
      'BATCH_SIZE': settings.batchSize.toString(),
      'BATCH_DELAY': settings.batchDelay.toString(),
      'MODEL_NAME': settings.modelName,
      'CACHE_DURATION': settings.cacheDuration.toString()
    });
    
    // به‌روزرسانی متغیرهای جهانی (برای اجرای جاری)
    // توجه: این تغییرات فقط برای اجرای جاری اعمال می‌شود
    // برای اعمال دائمی نیاز به راه‌اندازی مجدد اسکریپت است
    
    return { success: true, message: 'تنظیمات با موفقیت ذخیره شدند' };
  } catch (error) {
    return { success: false, message: `خطا در ذخیره تنظیمات: ${error}` };
  }
}

function getFrontendLogs(type) {
  try {
    const sheet = SpreadsheetApp.openByUrl(SHEET_URL).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return 'هیچ لاگی یافت نشد';
    }
    
    let logs = '';
    const headers = data[0];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[row.length - 1];
      const shouldInclude = 
        type === 'all' || 
        (type === 'errors' && status && status.includes('ERROR')) ||
        (type === 'success' && status && status.includes('SUCCESS'));
      
      if (shouldInclude) {
        const date = row[0] ? new Date(row[0]).toLocaleString('fa-IR') : 'تاریخ نامعلوم';
        const fileName = row[2] || 'نام فایل نامعلوم';
        logs += `📅 ${date}\n📁 ${fileName}\n🔄 ${status}\n${'-'.repeat(50)}\n`;
      }
    }
    
    return logs || 'هیچ لاگی برای فیلتر انتخاب شده یافت نشد';
  } catch (error) {
    return `خطا در دریافت لاگ‌ها: ${error}`;
  }
}

function clearFrontendLogs() {
  try {
    const sheet = SpreadsheetApp.openByUrl(SHEET_URL).getActiveSheet();
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clear();
      return { success: true, message: 'لاگ‌ها با موفقیت پاکسازی شدند' };
    }
    return { success: true, message: 'لاگی برای پاکسازی وجود ندارد' };
  } catch (error) {
    return { success: false, message: `خطا در پاکسازی لاگ‌ها: ${error}` };
  }
}

// تابع برای نمایش فرانت اند - نام فایل را اصلاح کنید
function showFrontEnd() {
  try {
    const html = HtmlService.createTemplateFromFile('FileProcessor_Dashboard')
      .evaluate()
      .setTitle('کنترل پنل پردازش فایل - سیستم هوشمند')
      .setWidth(1200)
      .setHeight(800);
    
    SpreadsheetApp.getUi().showModalDialog(html, '🎯 کنترل پنل پردازش فایل');
  } catch (error) {
    SpreadsheetApp.getUi().alert('خطا در بارگذاری فرانت اند: ' + error.toString());
  }
}

// تابع doGet اصلاح شده - بدون متا تگ‌های مشکل‌ساز
function doGet() {
  try {
    const html = HtmlService.createTemplateFromFile('FileProcessor_Dashboard')
      .evaluate()
      .setTitle('سیستم پردازش هوشمند فایل‌ها')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    return html;
  } catch (error) {
    // صفحه خطای ساده بدون متا تگ‌های مشکل‌ساز
    return HtmlService.createHtmlOutput(
      '<html><body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #1a202c; color: white;">' +
      '<h1>⚠️ خطا در بارگذاری سیستم</h1>' +
      '<div style="background: #e53e3e; padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 500px;">' +
      '<p><strong>خطا:</strong> ' + error.toString() + '</p>' +
      '<p>لطفا از صحت تنظیمات اطمینان حاصل کنید.</p>' +
      '</div></body></html>'
    );
  }
}

// تابع برای include کردن فایل‌های HTML/CSS/JS اگر لازم باشد
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ایجاد منوی سفارشی در Google Sheets - این تابع الزامی است
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🎯 پردازش فایل')
      .addItem('🚀 باز کردن کنترل پنل', 'showFrontEnd')
      .addSeparator()
      .addItem('📊 بررسی وضعیت سیستم', 'getDetailedProcessingStatus')
      .addItem('🔧 سازماندهی فایل‌ها', 'organizeFilesAutomatically')
      .addSeparator()
      .addItem('▶️ شروع پردازش', 'startChainedProcessing')
      .addItem('⏹️ توقف پردازش', 'stopChainedProcessing')
      .addSeparator()
      .addItem('🧪 تست سلامت سیستم', 'testAPIConnection')
      .addToUi();
    
    Logger.log('✅ منوی سفارشی با موفقیت ایجاد شد');
  } catch (error) {
    Logger.log('❌ خطا در ایجاد منو: ' + error.toString());
  }
}

// تابع برای نصب منو (اگر onOpen کار نکرد)
function installMenu() {
  onOpen();
}

// توابع جدید برای پشتیبانی بهتر از Web App
function getAppConfig() {
  return {
    appName: "سیستم پردازش هوشمند فایل‌ها",
    version: "2.0.0",
    deployed: true,
    features: {
      batchProcessing: true,
      fileOrganization: true,
      promptManagement: true,
      realTimeLogs: true
    }
  };
}

// تابع برای بررسی مجوزهای دسترسی
function checkPermissions() {
  try {
    // تست دسترسی‌های مختلف
    DriveApp.getRootFolder();
    SpreadsheetApp.openByUrl(SHEET_URL);
    PropertiesService.getScriptProperties().getProperties();
    
    return {
      success: true,
      permissions: {
        drive: true,
        spreadsheet: true,
        properties: true
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      permissions: {
        drive: false,
        spreadsheet: false,
        properties: false
      }
    };
  }
}

// تابع برای مدیریت بهتر خطاها در بک‌اند
function handleWebAppErrors() {
  try {
    // بررسی مجوزهای لازم
    const scopes = [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/script.external_request'
    ];
    
    const currentScopes = ScriptApp.getOAuthToken() ? 'OK' : 'MISSING';
    
    return {
      status: 'active',
      scopes: currentScopes,
      timestamp: new Date().toISOString(),
      features: {
        drive: true,
        sheets: true,
        urlFetch: true
      }
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

// تابع برای تست مستقیم Web App
function testWebAppDirectly() {
  try {
    const testUrl = ScriptApp.getService().getUrl();
    Logger.log('Web App URL: ' + testUrl);
    
    const response = UrlFetchApp.fetch(testUrl, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Google-Apps-Script)'
      }
    });
    
    const responseCode = response.getResponseCode();
    const content = response.getContentText().substring(0, 200); // فقط بخشی از محتوا
    
    return {
      url: testUrl,
      statusCode: responseCode,
      preview: content,
      success: responseCode === 200
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// تابع تست کامل
function fullWebAppTest() {
  try {
    Logger.log('🧪 شروع تست کامل Web App...');
    
    // تست ۱: بررسی توابع اصلی
    const funcTest = testWebAppDirectly();
    Logger.log('تست Web App: ' + JSON.stringify(funcTest));
    
    // تست ۲: بررسی خطاها
    const errorTest = handleWebAppErrors();
    Logger.log('بررسی خطاها: ' + JSON.stringify(errorTest));
    
    // تست ۳: بررسی دسترسی‌ها
    const permTest = checkPermissions();
    Logger.log('بررسی دسترسی‌ها: ' + JSON.stringify(permTest));
    
    // نمایش لینک نهایی
    const finalUrl = ScriptApp.getService().getUrl();
    Logger.log('🎯 لینک نهایی Web App: ' + finalUrl);
    
    return {
      success: true,
      url: finalUrl,
      tests: {
        webApp: funcTest,
        errors: errorTest,
        permissions: permTest
      }
    };
  } catch (error) {
    Logger.log('❌ خطا در تست کامل: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  🧹 حذفِ ردیف‌های خطا — تا فایلِ خطاخورده بتواند دوباره تحلیل شود
//  چون هر شناسه‌ای که در شیت باشد «پردازش‌شده» حساب می‌شود، تنها راهِ امتحانِ
//  دوبارهٔ یک فایلِ خطاخورده حذفِ ردیفِ آن است. خودِ فایل در پوشهٔ منبع مانده.
// ═══════════════════════════════════════════════════════════════════════════

// بر پایهٔ همان ۱۸ سرستونِ شیت (صفر-پایه)
const STATUS_COLUMN_INDEX = 17;
const ANALYSIS_COLUMNS_TO_VERIFY = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

function cleanErrorRows() {
  return deleteErrorRows_(SHEET_URL, STATUS_COLUMN_INDEX, ANALYSIS_COLUMNS_TO_VERIFY);
}

/**
 * حذفِ امنِ ردیف‌های خطا — تا فایلِ خطاخورده بتواند دوباره تحلیل شود.
 *
 * ══ چرا با deleteRows و نه clearContents ══
 * روشِ قبلی کلِ شیت را clearContents می‌کرد و بعد ردیف‌های سالم را برمی‌گرداند.
 * یعنی بینِ آن دو خط، شیت **کاملاً خالی** بود. اگر همان‌جا اجرا قطع می‌شد —
 * مهلتِ ۶ دقیقه‌ایِ Apps Script، قطعیِ شبکه، پایانِ سهمیه — تمامِ ده‌ها هزار
 * ردیفِ تحلیل‌شده از بین می‌رفت. برای شیتی با ۳۵٬۰۰۰ ردیف این خطرِ واقعی بود.
 * deleteRows هر بازه را جدا حذف می‌کند و هیچ لحظه‌ای شیت خالی نمی‌شود؛ اگر
 * وسطش قطع شود، فقط بخشی از ردیف‌های خطا مانده و بقیهٔ داده سالم است.
 *
 * ══ چرا حذف و نه پاک‌کردنِ محتوا ══
 * پاک‌کردنِ محتوا یک ردیفِ خالی جا می‌گذارد و تحلیلِ بعدی همان‌جا می‌نشیند —
 * یعنی در ترتیبِ زمانی جلوتر از تحلیل‌های قدیمی‌تر ظاهر می‌شود.
 *
 * ══ دو شرطِ سخت برای حذف ══
 * ۱) وضعیت با ERROR شروع شود، و
 * ۲) هیچ‌کدام از ستون‌های تحلیل محتوا نداشته باشند.
 * ردیفی که تحلیلِ واقعی دارد هرگز حذف نمی‌شود، حتی اگر وضعیتش خطا بخورد.
 */
function deleteErrorRows_(sheetUrl, statusIdx, analysisIdxs) {
  const sheet = SpreadsheetApp.openByUrl(sheetUrl).getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) { Logger.log('✅ شیت خالی است'); return { removed: 0, kept: 0, skipped: 0 }; }

  const data = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();

  const doomed = [];
  let skipped = 0;
  for (let i = 1; i < data.length; i++) {
    const status = String(data[i][statusIdx] || '');
    if (status.indexOf('ERROR') !== 0) continue;

    let hasAnalysis = false;
    for (let c = 0; c < analysisIdxs.length; c++) {
      const v = String(data[i][analysisIdxs[c]] || '').trim();
      if (v && v !== '{}' && v !== '[]') { hasAnalysis = true; break; }
    }
    if (hasAnalysis) { skipped++; continue; }

    doomed.push(i + 1);
  }

  if (!doomed.length) {
    Logger.log(`✅ هیچ ردیفِ خطای بی‌تحلیلی نبود (${skipped} ردیفِ خطا محتوا داشتند و دست نخوردند)`);
    return { removed: 0, kept: lastRow - 1, skipped: skipped };
  }

  // از پایین به بالا، و ردیف‌های پشت‌سرهم یک‌جا
  let removed = 0;
  let end = doomed.length - 1;
  while (end >= 0) {
    let start = end;
    while (start > 0 && doomed[start - 1] === doomed[start] - 1) start--;
    const count = end - start + 1;
    sheet.deleteRows(doomed[start], count);
    removed += count;
    end = start - 1;
  }

  PROCESSED_FILE_IDS_CACHE = null;
  CACHE_TIMESTAMP = null;
  Logger.log(`🧹 ${removed} ردیفِ خطا حذف شد · ${skipped} ردیفِ خطای دارای محتوا دست نخورد · ` +
             `${sheet.getLastRow() - 1} ردیف باقی ماند`);
  return { removed: removed, kept: sheet.getLastRow() - 1, skipped: skipped };
}

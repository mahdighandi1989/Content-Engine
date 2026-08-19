// A. ثوابت پروژه (Project Constants)
// **********************************************
// 🔧 سیستم کش برای بهینه‌سازی
let PROCESSED_FILE_IDS_CACHE = null;
let CACHE_TIMESTAMP = null;
const CACHE_DURATION = 30000; // 30 ثانیه کش

// این مقادیر را با شناسه‌ها و آدرس‌های خود جایگزین کنید
const SOURCE_FOLDER_ID = '1DAyVkLFKNbk226n1Y-HuWX_PYrkKE7w1'; // شناسه پوشه ورودی اصلی شما
const ARCHIVE_FOLDER_ID = '1-y8fs_m5LJFULT2Jafibju0Yk5jPxz49'; // شناسه پوشه بایگانی شما  
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1VBqPb-Vd_e0yGc2IXRO7vsyFf9q4Dy6iND8yD6A9WWQ/edit?gid=0#gid=0'; // URL شیت گوگل
const API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
// **********************************************



// 🔄 سیستم پردازش زنجیره‌ای خودکار
let CURRENT_BATCH = 0;
let PENDING_FILES = []; // لیست فایل‌های در انتظار پردازش
const BATCH_SIZE = 20; // کاهش بیشتر سایز دسته به 20
const DELAY_BETWEEN_BATCHES = 60; // کاهش زمان انتظار به 60 ثانیه

// 🛡️ محافظ‌های جدید (اصلاحیه)
const MAX_RETRIES_PER_FILE = 2;   // حداکثر تلاش مجدد برای هر فایل
const STATUS_COLUMN_INDEX = 15;   // اندیس ستون وضعیت در شیت (صفر-پایه)
// ستون‌هایی که اگر محتوا داشته باشند یعنی تحلیلِ واقعی انجام شده.
// deleteErrorRows_ ردیفی را که هرکدامشان پر باشد حذف نمی‌کند، حتی با وضعیتِ خطا.
const ANALYSIS_COLUMNS_TO_VERIFY = [5, 6, 7, 8, 9, 10, 11, 12, 13];

const UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=multipart';
const GENERATE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

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
        
        // اطلاعات اصلی تصویر
        Image_Basic_Info: {
          type: 'object',
          properties: {
            Image_Type: { type: 'string' }, // عکس، اسکرین‌شات، دانلودی، گرافیک
            Capture_Source: { type: 'string' }, // گوشی، دوربین حرفه‌ای، اسکرین‌شات
            Estimated_Creation_Date: { type: 'string' },
            Date_Confidence: { type: 'string' },
            Image_Quality: { type: 'string' },
            Resolution: { type: 'string' }
          }
        },
        
        // استخراج متن از تصویر
        Text_Extraction: {
          type: 'object',
          properties: {
            Original_Text: { type: 'string' },
            Detected_Language: { type: 'string' },
            Persian_Translation: { type: 'string' },
            Text_Confidence: { type: 'string' }
          }
        },
        
        // شناسایی اشخاص
        Persons_Identified: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              Name: { type: 'string' },
              Role: { type: 'string' },
              Description: { type: 'string' },
              Confidence: { type: 'string' },
              Position: { type: 'string' } // موقعیت در تصویر
            }
          }
        },
        
        // شناسایی مکان‌ها
        Locations_Identified: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              Location_Name: { type: 'string' },
              Type: { type: 'string' }, // داخلی، خارجی، طبیعت، شهری
              Description: { type: 'string' },
              Confidence: { type: 'string' }
            }
          }
        },
        
        // تحلیل محتوای اصلی
        Content_Analysis: {
          type: 'object',
          properties: {
            Main_Subject: { type: 'string' },
            Category: { type: 'string' }, // شخصی، تبلیغاتی، آموزشی، خبری
            Key_Message: { type: 'string' },
            Notable_Elements: { type: 'string' }
          }
        },
        
        // تحلیل فنی
        Technical_Analysis: {
          type: 'object',
          properties: {
            Color_Scheme: { type: 'string' },
            Lighting: { type: 'string' },
            Composition: { type: 'string' },
            Editing_Signs: { type: 'string' } // نشانه‌های ویرایش
          }
        },
        
        // کاربردها و توصیه‌ها
        Usage_Recommendations: {
          type: 'array',
          items: { type: 'string' }
        },
        
        // تحلیل احساسی و فضاسازی
        Vibe_Atmosphere: { type: 'string' },
        
        // خلاصه اجرایی
        Executive_Summary: { type: 'string' },
        
        // موارد ویژه
        Special_Notes: { type: 'string' }
      },
      required: ['File_ID', 'File_Name', 'Text_Extraction', 'Vibe_Atmosphere', 'Executive_Summary']
    }
  }
};

const SYSTEM_INSTRUCTION = {
  parts: [{ text: "You are an expert Multimodal Image Analyst, specializing in comprehensive image analysis and Persian language. Your task is to analyze the provided image in extreme detail and output the analysis strictly in Farsi and JSON format, adhering to the specified schema." }]
};

const USER_PROMPT = `
تصویر پیوست شده را با بالاترین سطح دقت و جزئیات تحلیل کنید. تحلیل باید به قدری جامع باشد که نیاز به مشاهده خود تصویر به طور کامل برطرف شود.

# دستورالعمل‌های کلی:
- تمام خروجی به زبان فارسی روان و سلیس باشد
- از اصطلاحات تخصصی مناسب استفاده شود
- تحلیل بر اساس شواهد موجود در تصویر باشد
- ساختار JSON کاملاً رعایت شود

# بخش‌های مورد تحلیل:

## ۱. تشخیص نوع و منبع تصویر
- نوع تصویر (عکس معمولی، اسکرین‌شات، تصویر دانلود شده، گرافیک)
- منبع ثبت (گوشی موبایل، دوربین حرفه‌ای، اسکرین‌شات کامپیوتر)
- نشانه‌های تشخیص منبع (نویز، واترمارک، رابط کاربری)
- احتمال دانلود از اینترنت یا شبکه‌های اجتماعی

## ۲. اطلاعات زمانی
- تاریخ تخمینی ثبت تصویر
- دوره زمانی (قدیمی، جدید، معاصر)
- نشانه‌های زمانی (سبک، تکنولوژی، مد)
- سطح اطمینان از تاریخ تخمینی

## ۳. استخراج متن و ترجمه
- استخراج تمام متون قابل مشاهده در تصویر
- تشخیص زبان اصلی متن‌ها
- ترجمه دقیق به فارسی اگر زبان اصلی غیرفارسی باشد
- سطح اطمینان از خوانش متن

## ۴. شناسایی اشخاص
- اسامی اشخاص قابل شناسایی
- نقش و موقعیت اجتماعی
- مشخصات ظاهری (چهره، لباس، حالت‌ها)
- موقعیت هر شخص در کادر تصویر
- اگر شخص معروفی شناسایی شد، اطلاعات کامل ارائه شود

## ۵. شناسایی مکان‌ها
- مکان‌های قابل شناسایی
- نوع مکان (داخلی، خارجی، طبیعت، شهری)
- نشانه‌های جغرافیایی
- معماری و محیط

## ۶. تحلیل محتوای اصلی
- موضوع اصلی تصویر
- دسته‌بندی محتوا (شخصی، تبلیغاتی، آموزشی، خبری، هنری)
- پیام اصلی و هدف عکاس/سازنده
- عناصر قابل توجه و ویژه

## ۷. تحلیل فنی و زیبایی‌شناسی
- ترکیب‌بندی و کادربندی
- طرح رنگی و هارمونی رنگ‌ها
- نورپردازی و سایه‌ها
- کیفیت فنی تصویر
- نشانه‌های ویرایش یا دستکاری

## ۸. کاربردها و توصیه‌ها
- کاربردهای مناسب این تصویر
- پیشنهاداتی برای استفاده‌های مختلف
- گروه‌های هدف مناسب

## ۹. تحلیل احساسی و فضاسازی
- فضای کلی تصویر
- احساسات القا شده
- جو و اتمسفر
- نمادها و نشانه‌های احساسی

## ۱۰. خلاصه اجرایی
- خلاصه ۳ خطی از کل تحلیل
- سه نکته کلیدی
- موارد ویژه و قابل توجه

## ۱۱. موارد ویژه
- هر نکته خاص یا غیرمعمول
- تناقضات یا موارد مبهم
- توصیه‌های ویژه

# توجه ویژه:
- در صورت عدم وجود اطلاعات کافی، "پیدا نشد" ذکر شود
- تحلیل باید مبتنی بر شواهد بصری باشد
- از حدس و گمان بدون پشتیبانی بصری خودداری شود
- برای عناصر مهم، سطح اطمینان ذکر شود
`;

// ******************************************************
// توابع اصلی
// ******************************************************

// 🔧 تابع برای دریافت فایل‌های پردازش شده از شیت
function getAllProcessedFileIds() {
  const now = new Date().getTime();
  
  if (PROCESSED_FILE_IDS_CACHE && CACHE_TIMESTAMP && (now - CACHE_TIMESTAMP) < CACHE_DURATION) {
    return PROCESSED_FILE_IDS_CACHE;
  }
  
  try {
    const sheet = SpreadsheetApp.openByUrl(SHEET_URL).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    const processedIds = [];
    
    // هر شناسه‌ای که در شیت هست «پردازش‌شده» است — چه موفق، چه با خطا.
    //
    // این طراحیِ اصلی است و تحلیلگرِ ویدیو هم دقیقاً همین را دارد. یک «اصلاحیه»
    // قبلاً ردیف‌های ERROR را بیرون گذاشته بود تا شکستِ گذرا دوباره امتحان شود؛
    // ولی فایلِ خطاخورده در پوشهٔ منبع می‌ماند، پس هر دور دوباره صف می‌شد و باز
    // می‌شکست: ۲۳۲ خطا از ۲۳۶ خطای هفته فقط از همین حلقه بود، و هر تلاش یک
    // ردیفِ ERROR تازه هم به شیت اضافه می‌کرد.
    //
    // شکستِ گذرا همچنان پوشش دارد: MAX_RETRIES_PER_FILE داخلِ همان اجرا دوباره
    // تلاش می‌کند. برای امتحانِ دوبارهٔ عمدیِ یک فایل، cleanErrorRows() ردیفش را
    // حذف می‌کند و دورِ بعد دوباره سراغش می‌رود.
    for (let i = 1; i < data.length; i++) {
      if (data[i][1]) {                       // ستون File ID
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

// 🔍 تابع جستجوی بهینه‌شده با محدودیت زمان و تعداد
function findImageFilesWithTimeout() {
  const startTime = new Date().getTime();
  const MAX_SEARCH_TIME = 20000; // کاهش به 20 ثانیه
  const MAX_FILES = 500; // محدودیت تعداد فایل‌ها
  const sourceFolder = DriveApp.getFolderById(SOURCE_FOLDER_ID);
  const allFiles = [];
  let foldersProcessed = 0;
  
  // استفاده از صف برای جستجوی غیربازگشتی
  const folderQueue = [sourceFolder];
  
  while (folderQueue.length > 0 && 
         (new Date().getTime() - startTime) < MAX_SEARCH_TIME && 
         allFiles.length < MAX_FILES) {
    
    const currentFolder = folderQueue.shift();
    foldersProcessed++;
    
    try {
      // پردازش فایل‌های این پوشه
      const files = currentFolder.getFiles();
      while (files.hasNext() && allFiles.length < MAX_FILES) {
        const file = files.next();
        if (isValidImageFile(file)) {
          allFiles.push({
            id: file.getId(),
            name: file.getName(),
            fileObj: file
          });
        }
        
        // بررسی زمان
        if (new Date().getTime() - startTime >= MAX_SEARCH_TIME) {
          Logger.log(`⏰ توقف جستجو پس از ${MAX_SEARCH_TIME/1000} ثانیه`);
          break;
        }
      }
      
      // اضافه کردن زیرپوشه‌ها به صف
      const subfolders = currentFolder.getFolders();
      while (subfolders.hasNext() && allFiles.length < MAX_FILES) {
        folderQueue.push(subfolders.next());
      }
    } catch (error) {
      Logger.log(`⚠️ خطا در پردازش پوشه: ${error}`);
    }
  }
  
  Logger.log(`✅ جستجو کامل: ${foldersProcessed} پوشه، ${allFiles.length} فایل تصویری یافت شد`);
  return allFiles;
}

// ✅ تابع بررسی معتبر بودن فایل تصویری
function isValidImageFile(file) {
  const fileName = file.getName().toLowerCase();
  const fileSize = file.getSize();
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.heic'];
  const imageMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/tiff', 'image/heic'];
  
  const hasValidExtension = imageExtensions.some(ext => fileName.endsWith(ext));
  const hasValidMime = imageMimes.includes(file.getMimeType());
  const hasValidSize = fileSize > 1000 && fileSize <= 20 * 1024 * 1024;
  
  return (hasValidExtension || hasValidMime) && hasValidSize;
}

// 💾 توابع مدیریت وضعیت با PropertiesService (ظرفیت بیشتر)
function savePendingFilesToCache() {
  try {
    const props = PropertiesService.getScriptProperties();
    
    // تقسیم لیست به بخش‌های کوچکتر
    const chunks = [];
    const chunkSize = 200; // هر بخش 200 فایل
    
    for (let i = 0; i < PENDING_FILES.length; i += chunkSize) {
      const chunk = PENDING_FILES.slice(i, i + chunkSize).map(f => ({ 
        id: f.id, 
        name: f.name,
        retries: f.retries || 0
      }));
      chunks.push(chunk);
    }
    
    const data = {
      chunks: chunks,
      totalFiles: PENDING_FILES.length,
      timestamp: new Date().getTime(),
      batch: CURRENT_BATCH,
      chunkCount: chunks.length
    };
    
    props.setProperty('pending_files_data', JSON.stringify(data));
    Logger.log(`✅ وضعیت ذخیره شد: ${PENDING_FILES.length} فایل در ${chunks.length} بخش`);
    
  } catch (error) {
    Logger.log(`❌ خطا در ذخیره وضعیت: ${error}`);
  }
}

function getPendingFilesFromCache() {
  try {
    const props = PropertiesService.getScriptProperties();
    const cached = props.getProperty('pending_files_data');
    
    if (cached) {
      const data = JSON.parse(cached);
      Logger.log(`📂 بازیابی ${data.totalFiles} فایل از کش (${data.chunkCount} بخش)`);
      
      // ترکیب کردن تمام بخش‌ها
      const allFiles = [];
      for (const chunk of data.chunks) {
        for (const fileInfo of chunk) {
          try {
            allFiles.push({
              id: fileInfo.id,
              name: fileInfo.name,
              retries: fileInfo.retries || 0,
              fileObj: DriveApp.getFileById(fileInfo.id)
            });
          } catch (e) {
            Logger.log(`⚠️ فایل ${fileInfo.id} پیدا نشد، حذف از لیست`);
          }
        }
      }
      
      CURRENT_BATCH = data.batch || 0;
      Logger.log(`✅ ${allFiles.length} فایل بازیابی شد`);
      return allFiles;
    }
  } catch (e) {
    Logger.log('❌ خطا در بازیابی کش: ' + e.toString());
  }
  
  return [];
}

function clearPendingFilesCache() {
  try {
    const props = PropertiesService.getScriptProperties();
    props.deleteProperty('pending_files_data');
    Logger.log('✅ کش وضعیت پاک شد');
  } catch (error) {
    Logger.log('⚠️ خطا در پاک کردن کش: ' + error);
  }
}

// 🔄 تابع اصلی پردازش زنجیره‌ای بهینه‌شده
function processChainedBatch() {
  CURRENT_BATCH++;
  Logger.log(`\n🔄 شروع دسته پردازش ${CURRENT_BATCH}...`);
  
  const archiveFolder = DriveApp.getFolderById(ARCHIVE_FOLDER_ID);
  const sheet = SpreadsheetApp.openByUrl(SHEET_URL).getActiveSheet();

  // اگر لیست pending خالی است، از کش استفاده کن
  if (PENDING_FILES.length === 0) {
    PENDING_FILES = getPendingFilesFromCache();
  }

  if (PENDING_FILES.length === 0) {
    Logger.log("🎉 همه فایل‌ها پردازش شدند! پردازش زنجیره‌ای متوقف شد.");
    cleanupTriggers();
    return;
  }

  // برداشتن دسته بعدی از لیست pending
  const filesToProcess = PENDING_FILES.splice(0, BATCH_SIZE);
  Logger.log(`📦 دسته ${CURRENT_BATCH}: ${filesToProcess.length} فایل برای پردازش`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const fileInfo of filesToProcess) {
    let geminiFileId = null;
    let analysisResult = null;

    try {
      Logger.log(`\n🔹 پردازش فایل ${successCount + errorCount + 1} از ${filesToProcess.length}: ${fileInfo.name}`);
      
      const geminiFile = uploadFileToGemini(fileInfo.fileObj);
      geminiFileId = geminiFile.name;
      pollFileStatus(geminiFileId);
      analysisResult = analyzeImageContent(geminiFileId, fileInfo.id, fileInfo.name);

      const newFileName = generatePersianFileName(analysisResult, fileInfo.name);
      const renamedFileName = renameFileInDrive(fileInfo.id, newFileName);
      if (renamedFileName) analysisResult.New_File_Name = renamedFileName;

      // ترتیب عمداً این است: اول نتیجه در شیت ثبت شود، بعد فایل جابه‌جا شود.
      // پیشتر برعکس بود و اگر بینِ انتقال و ثبت خطایی می‌آمد (سهمیه، قفلِ شیت،
      // قطعیِ لحظه‌ای)، فایل از پوشهٔ منبع رفته بود ولی تحلیلش ثبت نشده بود —
      // هیچ دوری دیگر پیدایش نمی‌کرد و تحلیل برای همیشه از دست می‌رفت.
      const fileLink = createShareableLink(fileInfo.id);
      analysisResult.File_Link = fileLink;

      writeAnalysisToSheet(sheet, analysisResult, "SUCCESS");

      moveFileToArchive(fileInfo.fileObj, DriveApp.getFolderById(SOURCE_FOLDER_ID), archiveFolder);
      
      // آپدیت کش فایل‌های پردازش شده
      if (PROCESSED_FILE_IDS_CACHE) {
        PROCESSED_FILE_IDS_CACHE.push(fileInfo.id);
      }
      
      Logger.log(`✅ موفق: ${fileInfo.name}`);
      Logger.log(`   نام جدید: ${analysisResult.New_File_Name}`);
      
      successCount++;
      
    } catch (e) {
      errorCount++;
      const msg = e.toString();
      Logger.log(`❌ خطا: ${fileInfo.name} - ${msg}`);

      // 🛑 اصلاحیه: خطای احراز هویت = توقف فوری کل زنجیره
      if (msg.indexOf('403') > -1 || msg.indexOf('401') > -1 ||
          msg.indexOf('API key') > -1 || msg.indexOf('PERMISSION_DENIED') > -1) {
        writeErrorToSheet(sheet, fileInfo.id, fileInfo.name, msg);
        if (geminiFileId) { try { deleteFileFromGemini(geminiFileId); } catch (x) {} }
        cleanupTriggers();
        clearPendingFilesCache();
        Logger.log('🛑 توقف اضطراری: مشکل کلید API. زنجیره متوقف و کش پاک شد.');
        throw new Error('🛑 توقف اضطراری: خطای احراز هویت Gemini — کلید را بررسی کنید');
      }

      // 🛡️ اصلاحیه: سقف تلاش مجدد (جلوگیری از حلقه بی‌نهایت)
      fileInfo.retries = (fileInfo.retries || 0) + 1;
      if (fileInfo.retries < MAX_RETRIES_PER_FILE) {
        Logger.log(`   ↩️ تلاش ${fileInfo.retries}/${MAX_RETRIES_PER_FILE} — به صف برگشت`);
        PENDING_FILES.push(fileInfo);
      } else {
        Logger.log(`   ⛔ پس از ${MAX_RETRIES_PER_FILE} تلاش کنار گذاشته شد`);
        writeErrorToSheet(sheet, fileInfo.id, fileInfo.name, msg);
      }
    } finally {
      if (geminiFileId) {
        try {
          deleteFileFromGemini(geminiFileId);
        } catch (deleteError) {
          Logger.log(`⚠️ خطا در حذف: ${deleteError}`);
        }
      }
    }
    
    // تأخیر کوتاه بین پردازش فایل‌ها برای جلوگیری از timeout
    if (successCount + errorCount < filesToProcess.length) {
      Utilities.sleep(3000); // افزایش تأخیر به 3 ثانیه
    }
  }

  Logger.log(`\n📊 گزارش دسته ${CURRENT_BATCH}:`);
  Logger.log(`   ✅ موفق: ${successCount}`);
  Logger.log(`   ❌ خطا: ${errorCount}`);
  Logger.log(`   📁 کل: ${filesToProcess.length}`);

  // ذخیره وضعیت فعلی در کش
  savePendingFilesToCache();

  if (PENDING_FILES.length > 0) {
    Logger.log(`\n⏳ ${PENDING_FILES.length} فایل باقی مانده. راه‌اندازی دسته بعدی در ${DELAY_BETWEEN_BATCHES} ثانیه...`);
    scheduleNextBatch();
  } else {
    Logger.log("\n🎉 همه فایل‌ها پردازش شدند! کار به پایان رسید.");
    cleanupTriggers();
    clearPendingFilesCache();
    sendCompletionNotification(successCount, errorCount);
  }
}

// 🚀 تابع شروع پردازش بهینه‌شده
function startChainedProcessing() {
  Logger.log("🚀 شروع پردازش زنجیره‌ای بهینه‌شده...");
  
  // پاکسازی کش‌های قدیمی
  PROCESSED_FILE_IDS_CACHE = null;
  CACHE_TIMESTAMP = null;
  PENDING_FILES = [];
  
  Logger.log("🔍 در حال جستجوی فایل‌های تصویری...");
  const allImageFiles = findImageFilesWithTimeout();
  
  if (allImageFiles.length === 0) {
    Logger.log("📭 هیچ فایل تصویری جدیدی برای پردازش پیدا نشد.");
    return;
  }
  
  const processedIds = getAllProcessedFileIds();
  const processedSet = new Set(processedIds);
  
  // فیلتر فایل‌های پردازش نشده
  PENDING_FILES = allImageFiles.filter(file => !processedSet.has(file.id));
  
  if (PENDING_FILES.length === 0) {
    Logger.log("✅ همه فایل‌های موجود قبلاً پردازش شده‌اند.");
    return;
  }
  
  const estimatedBatches = Math.ceil(PENDING_FILES.length / BATCH_SIZE);
  const estimatedTime = Math.ceil((estimatedBatches * (DELAY_BETWEEN_BATCHES + 30)) / 60);
  
  Logger.log(`
📋 برنامه پردازش:
   📁 فایل‌های تصویری جدید: ${PENDING_FILES.length}
   📦 سایز دسته: ${BATCH_SIZE} فایل
   🔄 تعداد دسته‌های预估ی: ${estimatedBatches}
   ⏰ زمان تخمینی: ${estimatedTime} دقیقه
  `);
  
  // ذخیره در کش
  savePendingFilesToCache();
  
  CURRENT_BATCH = 0;
  processChainedBatch();
}

// 📝 تابع تحلیل تصویر
function analyzeImageContent(geminiFileId, driveFileId, driveFileName) {
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
            mimeType: getMimeTypeForGemini(driveFileName),
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
    
    analysisData.File_ID = driveFileId;
    analysisData.File_Name = driveFileName;

    return analysisData;
  } catch (e) {
    throw new Error(`خطا در تجزیه خروجی JSON مدل: ${e.toString()}. متن خام: ${rawJsonText}`);
  }
}

// 🔧 تابع برای تشخیص MIME Type مناسب برای جمینی
function getMimeTypeForGemini(fileName) {
  const extension = fileName.toLowerCase().split('.').pop();
  
  const mimeMap = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg', 
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'tiff': 'image/tiff',
    'heic': 'image/heic'
  };
  
  return mimeMap[extension] || 'image/jpeg';
}

// 🎯 تابع برای تولید نام فارسی بر اساس تحلیل
function generatePersianFileName(analysisData, originalName) {
  try {
    const now = new Date();
    const timestamp = Utilities.formatDate(now, 'Asia/Tehran', 'yyyyMMdd-HHmm');
    
    // استخراج اطلاعات کلیدی از تحلیل
    const mainSubject = analysisData.Content_Analysis?.Main_Subject || 'تصویر';
    const imageType = analysisData.Image_Basic_Info?.Image_Type || 'عکس';
    const vibe = analysisData.Vibe_Atmosphere ? analysisData.Vibe_Atmosphere.split(' ')[0] : 'تحلیل‌شده';
    
    // ایجاد نام معنادار
    let newName = `${imageType}_${mainSubject}_${vibe}`;
    
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

// 📊 تابع برای نوشتن تحلیل در شیت
function writeAnalysisToSheet(sheet, data, status) {
  const newRow = [
    new Date(), // تاریخ پردازش
    data.File_ID || '',
    data.File_Name || '', // نام اصلی
    data.New_File_Name || '', // نام جدید
    data.File_Link || '', // لینک دسترسی
    
    // اطلاعات پایه تصویر
    data.Image_Basic_Info ? JSON.stringify(data.Image_Basic_Info) : '{}',
    
    // استخراج متن
    data.Text_Extraction ? JSON.stringify(data.Text_Extraction) : '{}',
    
    // اشخاص شناسایی شده
    data.Persons_Identified ? JSON.stringify(data.Persons_Identified) : '[]',
    
    // مکان‌های شناسایی شده
    data.Locations_Identified ? JSON.stringify(data.Locations_Identified) : '[]',
    
    // تحلیل محتوا
    data.Content_Analysis ? JSON.stringify(data.Content_Analysis) : '{}',
    
    // تحلیل فنی
    data.Technical_Analysis ? JSON.stringify(data.Technical_Analysis) : '{}',
    
    // کاربردها
    data.Usage_Recommendations ? JSON.stringify(data.Usage_Recommendations) : '[]',
    
    // فضای احساسی
    data.Vibe_Atmosphere || '',
    
    // خلاصه اجرایی
    data.Executive_Summary || '',
    
    // موارد ویژه
    data.Special_Notes || '',
    
    status
  ];
  
  sheet.appendRow(newRow);
}

// ⚠️ تابع نوشتن خطا در شیت
function writeErrorToSheet(sheet, fileId, fileName, errorMessage) {
  const errorRow = [
    new Date(),
    fileId,
    fileName,
    '', // New_File_Name
    '', // File_Link
    '{}', // Image_Basic_Info
    '{}', // Text_Extraction
    '[]', // Persons_Identified
    '[]', // Locations_Identified
    '{}', // Content_Analysis
    '{}', // Technical_Analysis
    '[]', // Usage_Recommendations
    '', // Vibe_Atmosphere
    '', // Executive_Summary
    '', // Special_Notes
    'ERROR: ' + errorMessage.substring(0, 100)
  ];
  sheet.appendRow(errorRow);
}

// 🔄 مدیریت تریگرها
function scheduleNextBatch() {
  try {
    cleanupTriggers();
    
    ScriptApp.newTrigger('processChainedBatch')
      .timeBased()
      .after(DELAY_BETWEEN_BATCHES * 1000)
      .create();
    
    Logger.log(`✅ تریگر دسته بعدی تنظیم شد (${DELAY_BETWEEN_BATCHES} ثانیه دیگر)`);
  } catch (error) {
    Logger.log(`❌ خطا در تنظیم تریگر: ${error}`);
  }
}

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
  CURRENT_BATCH = 0;
}

// 📧 توابع کمکی برای عملیات فایل
function uploadFileToGemini(driveFile) {
  try {
    const blob = driveFile.getBlob();
    Logger.log(`آپلود فایل: ${driveFile.getName()} (${blob.getBytes().length} بایت)`);
    
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
    
    let fileId = null;
    if (jsonResponse.file && jsonResponse.file.name) {
      fileId = jsonResponse.file.name;
    } else if (jsonResponse.name) {
      fileId = jsonResponse.name;
    }
    
    if (!fileId) {
      Logger.log("ساختار پاسخ کامل: " + JSON.stringify(jsonResponse, null, 2));
      throw new Error("فایل آپلود شد اما File ID در پاسخ دریافت نشد.");
    }
    
    const result = {
      name: fileId,
      file: jsonResponse.file
    };
    
    Logger.log(`آپلود موفق - File ID: ${fileId}`);
    return result;
    
  } catch (error) {
    Logger.log(`خطا در آپلود: ${error.toString()}`);
    throw error;
  }
}

function pollFileStatus(fileId) {
  const cleanFileId = fileId.replace(/^files\//, '');
  const GET_FILE_URL = `https://generativelanguage.googleapis.com/v1beta/files/${cleanFileId}?key=${API_KEY}`;
  
  Logger.log(`شروع نظرسنجی وضعیت برای فایل: ${cleanFileId}`);
  
  for (let i = 0; i < 10; i++) {
    try {
      Utilities.sleep(2000);
      
      const response = UrlFetchApp.fetch(GET_FILE_URL, { muteHttpExceptions: true });
      const responseText = response.getContentText();
      
      Logger.log(`نظرسنجی ${i+1}: کد ${response.getResponseCode()}`);
      
      if (response.getResponseCode() !== 200) {
        Logger.log(`خطا در دریافت وضعیت: ${responseText}`);
        if (i < 9) continue;
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
      
      Logger.log(`فایل ${cleanFileId} در حال پردازش... (${i+1} از 10)`);
      
    } catch (error) {
      Logger.log(`خطا در نظرسنجی وضعیت: ${error.message}`);
      if (i === 9) throw error;
    }
  }
  throw new Error(`زمان انتظار برای پردازش فایل ${cleanFileId} به پایان رسید.`);
}

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

function moveFileToArchive(file, sourceFolder, archiveFolder) {
  try {
    sourceFolder.removeFile(file);
    archiveFolder.addFile(file);
    Logger.log(`فایل ${file.getName()} با موفقیت به بایگانی منتقل شد.`);
  } catch (error) {
    Logger.log(`⚠️ خطا در انتقال فایل به بایگانی: ${error}`);
  }
}

function createShareableLink(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const link = file.getUrl();
    Logger.log(`✅ لینک دسترسی ایجاد شد: ${link}`);
    return link;
  } catch (error) {
    Logger.log(`❌ خطا در ایجاد لینک برای فایل ${fileId}: ${error}`);
    return 'لینک در دسترس نیست';
  }
}

function deleteFileFromGemini(geminiFileId) {
  try {
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

// 🧪 تست سیستم
function testOptimizedSystem() {
  Logger.log("🧪 تست سیستم بهینه‌شده...");
  
  // تست جستجو
  const files = findImageFilesWithTimeout();
  Logger.log(`✅ ${files.length} فایل در تست جستجو یافت شد`);
  
  // تست کش
  PENDING_FILES = files.slice(0, 3);
  savePendingFilesToCache();
  const recovered = getPendingFilesFromCache();
  Logger.log(`✅ ${recovered.length} فایل از کش بازیابی شد`);
  
  clearPendingFilesCache();
  Logger.log("✅ تست سیستم موفقیت‌آمیز بود");
}

// 🛑 توقف پردازش
function stopChainedProcessing() {
  Logger.log("🛑 توقف دستی پردازش زنجیره‌ای...");
  cleanupTriggers();
  clearPendingFilesCache();
  CURRENT_BATCH = 0;
  PENDING_FILES = [];
  Logger.log("✅ پردازش زنجیره‌ای متوقف شد");
}

// 📈 مشاهده وضعیت
function getProcessingStatus() {
  const triggers = ScriptApp.getProjectTriggers();
  const chainedTriggers = triggers.filter(t => t.getHandlerFunction() === 'processChainedBatch');
  
  const processedCount = getAllProcessedFileIds().length;
  const pendingCount = PENDING_FILES.length;
  
  const status = `
📊 وضعیت پردازش زنجیره‌ای:
   🔄 دسته جاری: ${CURRENT_BATCH}
   ✅ فایل‌های پردازش شده: ${processedCount}
   ⏳ فایل‌های در انتظار: ${pendingCount}
   🔗 تریگرهای فعال: ${chainedTriggers.length}
   🕒 فاصله بین دسته‌ها: ${DELAY_BETWEEN_BATCHES} ثانیه
  `;
  
  Logger.log(status);
  return status;
}

// ⚙️ تابع راه‌اندازی سرستون‌های شیت
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
    'اطلاعات پایه تصویر (JSON)',
    'استخراج متن (JSON)',
    'اشخاص شناسایی شده (JSON)',
    'مکان‌های شناسایی شده (JSON)',
    'تحلیل محتوا (JSON)',
    'تحلیل فنی (JSON)',
    'کاربردهای توصیه شده (JSON)',
    'فضا و وایب',
    'خلاصه اجرایی',
    'موارد ویژه',
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
  sheet.setColumnWidth(7, 250); // استخراج متن
  sheet.setColumnWidth(13, 150); // فضا و وایب
  
  Logger.log("✅ سرستون‌های شیت با موفقیت ایجاد شدند");
}

// 🎯 تابع اصلی برای اجرا (نقطه ورود تریگر ساعتی)
function main() {
  const busy = ScriptApp.getProjectTriggers()
    .some(t => t.getHandlerFunction() === 'processChainedBatch');
  if (busy) {
    Logger.log('⏳ زنجیره پردازش قبلی هنوز در جریان است — این اجرا رد شد');
    return;
  }

  try {
    startChainedProcessing();
  } catch (error) {
    Logger.log(`❌ خطا در اجرای اصلی: ${error.toString()}`);
  }
}

// 🔄 تابع برای ادامه پردازش از جایگاه قبلی
function resumeProcessing() {
  Logger.log("🔁 ادامه پردازش از جایگاه قبلی...");
  
  // بازیابی وضعیت از کش
  PENDING_FILES = getPendingFilesFromCache();
  
  if (PENDING_FILES.length === 0) {
    Logger.log("📭 هیچ فایل در انتظاری برای ادامه پردازش وجود ندارد.");
    return;
  }
  
  Logger.log(`⏳ ادامه پردازش ${PENDING_FILES.length} فایل باقی‌مانده...`);
  processChainedBatch();
}


// ======================================
// 🆕 توابع جدید (اصلاحیه)
// ======================================

/**
 * 🔑 تست سلامت کلید API
 * این را اول از همه اجرا کنید. باید CODE: 200 بدهد.
 */
function testGeminiKey() {
  if (!API_KEY) {
    Logger.log('❌ GEMINI_API_KEY در Script Properties تنظیم نشده است');
    return false;
  }
  const res = UrlFetchApp.fetch(GENERATE_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': API_KEY },
    payload: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] }),
    muteHttpExceptions: true
  });
  Logger.log('CODE: ' + res.getResponseCode());
  Logger.log('BODY: ' + res.getContentText());
  return res.getResponseCode() === 200;
}

/**
 * ⏰ ساخت تریگر خودکار ساعتی
 * فقط یک بار اجرا کنید (بعد از اینکه main دستی سالم اجرا شد).
 */
function setupAutoTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'main') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('main').timeBased().everyHours(1).create();
  Logger.log('✅ تریگر ساعتی برای main ساخته شد');
}

/**
 * 🛑 توقف کامل: حذف همه تریگرها و پاک کردن کش
 */
function stopEverything() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  clearPendingFilesCache();
  Logger.log(`🛑 ${triggers.length} تریگر حذف شد و کش پاک شد`);
}

/**
 * 🧹 حذف ردیف‌های خطا از شیت
 * قبل از راه‌اندازی مجدد یک بار اجرا کنید.
 * فایل‌های خطاخورده هنوز در پوشه منبع هستند و دوباره پردازش می‌شوند.
 */
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

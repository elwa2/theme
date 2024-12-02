document.addEventListener('DOMContentLoaded', async () => {
    const loadingEl = document.getElementById('loading');
    const resultsEl = document.getElementById('results');
    const themesListEl = document.getElementById('themesList');
    const errorEl = document.getElementById('error');
    const errorMessageEl = document.getElementById('errorMessage');
    const lastUpdateEl = document.getElementById('lastUpdate');

    // رابط Google Sheets
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQGkCT9-6C6YSkxTu981yeA1eCkRyjMhi1ntGDPYyvoUgtYLhrmIJ6AMAGB8WtwFkC3_yTUI0842D67/pub?gid=0&single=true&output=tsv';
    let themesData = {};

    function showLoading() {
        loadingEl.classList.remove('d-none');
        resultsEl.classList.add('d-none');
        errorEl.classList.add('d-none');
    }

    function showError(message) {
        loadingEl.classList.add('d-none');
        resultsEl.classList.add('d-none');
        errorEl.classList.remove('d-none');
        errorMessageEl.textContent = message;
    }

    function showResults(themes) {
        loadingEl.classList.add('d-none');
        errorEl.classList.add('d-none');
        resultsEl.classList.remove('d-none');

        if (themes.length === 0) {
            themesListEl.innerHTML = `
                <div class="alert alert-warning" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    لم يتم العثور على ثيمات معروفة
                </div>
            `;
            return;
        }

        themesListEl.innerHTML = themes.map(theme => {
            // التأكد من أن الثيم كائن وليس نصاً
            if (typeof theme !== 'object') {
                return `
                    <div class="theme-item">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <i class="fas fa-palette me-2"></i>
                                ${theme}
                            </div>
                        </div>
                    </div>
                `;
            }

            // عرض زر التخفيض فقط إذا كان هناك رابط تخفيض
            return `
                <div class="theme-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <i class="fas fa-palette me-2"></i>
                            ${theme.name}
                        </div>
                        ${theme.discountLink && theme.discountLink !== "0" ? `
                            <a href="${theme.discountLink}" target="_blank" class="btn btn-success btn-sm">
                                <i class="fas fa-tag me-1"></i>
                                احصل على تخفيض
                            </a>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async function fetchThemesData() {
        try {
            const response = await fetch(SHEET_URL);
            if (!response.ok) throw new Error('فشل تحميل بيانات الثيمات');
            
            const text = await response.text();
            const rows = text.split('\n').map(row => row.split('\t'));
            
            // تخطي الصف الأول (العناوين)
            const data = {};
            for (let i = 1; i < rows.length; i++) {
                const [code, name, discountLink] = rows[i];
                if (code && name) {
                    data[code] = discountLink ? { name, discountLink } : name;
                }
            }
            
            themesData = data;
            
            // تحديث تاريخ آخر تحديث
            const updateDate = new Date();
            lastUpdateEl.textContent = `آخر تحديث: ${updateDate.toLocaleDateString('ar-EG')}`;

            return true;
        } catch (error) {
            console.error('Error fetching themes data:', error);
            showError('فشل تحميل بيانات الثيمات. الرجاء المحاولة لاحقاً');
            return false;
        }
    }

    try {
        showLoading();

        // تحميل بيانات الثيمات من Google Sheets
        const dataLoaded = await fetchThemesData();
        if (!dataLoaded) return;

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                return document.documentElement.outerHTML;
            }
        });

        const pageContent = result[0].result;
        
        // البحث عن الثيمات
        const foundThemes = [];
        for (const [code, value] of Object.entries(themesData)) {
            if (pageContent.includes(code)) {
                foundThemes.push(value);
            }
        }

        showResults(foundThemes);

    } catch (error) {
        showError(error.message);
    }
});

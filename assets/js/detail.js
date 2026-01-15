// assets/js/detail.js
// PHIÊN BẢN: FULL TÍNH NĂNG (DEMO ẢNH, DOWNLOAD, MUA, YÊU THÍCH)

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. LẤY ID TỪ URL
    const params = new URLSearchParams(window.location.search);
    const docId = params.get('id');

    // Biến toàn cục lưu dữ liệu
    let currentDocData = null; 

    // Các Element giao diện
    const btnDownload = document.getElementById('btnDownload');
    const btnFavorite = document.querySelector('.btn-outline'); 
    const paymentModal = document.getElementById('paymentModal');
    const closePaymentBtn = document.getElementById('closePaymentBtn');
    
    // Element Lightbox (Xem ảnh phóng to)
    const lightboxModal = document.getElementById('lightboxModal');
    const lightboxImg = document.getElementById('lightboxImg');
    const closeLightbox = document.querySelector('.close-lightbox');

    // Nếu không có ID -> Về trang chủ
    if (!docId) {
        alert("Không tìm thấy tài liệu!");
        window.location.href = "index.html";
        return;
    }

    // ================================================================
    // 2. HÀM TẢI THÔNG TIN CHI TIẾT
    // ================================================================
    async function loadDetail() {
        // Gọi Supabase lấy thông tin
        const { data: doc, error } = await window.supabaseClient
            .from('documents')
            .select('*')
            .eq('id', docId)
            .single();

        if (error || !doc) {
            document.querySelector('.detail-container').innerHTML = 
                `<div style="text-align:center; padding:50px;">
                    <h2>Tài liệu không tồn tại hoặc đã bị xóa.</h2>
                    <a href="index.html" class="btn btn-primary">Về trang chủ</a>
                 </div>`;
            return;
        }

        // Lưu dữ liệu vào biến toàn cục
        currentDocData = doc;

        // --- ĐIỀN DỮ LIỆU CƠ BẢN ---
        document.title = `${doc.title} - DocShare`;
        document.getElementById('docTitle').textContent = doc.title;
        document.getElementById('docCategory').textContent = doc.category || 'Tài liệu';
        document.getElementById('docDate').textContent = new Date(doc.created_at).toLocaleDateString('vi-VN');
        document.getElementById('docDownloads').textContent = doc.downloads || 0;
        document.getElementById('docDesc').textContent = doc.description || "Chưa có mô tả cho tài liệu này.";
        
        // Ảnh bìa
        const thumbImg = document.getElementById('docThumb');
        thumbImg.src = doc.thumbnail_url || 'https://placehold.co/300x200?text=No+Image';
        thumbImg.onerror = () => { thumbImg.src = 'https://placehold.co/300x200?text=Error'; };

        // Giá tiền
        const priceEl = document.getElementById('docPrice');
        if (doc.price === 0) {
            priceEl.textContent = "Miễn phí";
            priceEl.style.color = "var(--secondary-color)";
        } else {
            priceEl.textContent = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(doc.price);
        }

        // --- XỬ LÝ ẢNH DEMO (XEM TRƯỚC) ---
        const demoSection = document.getElementById('demoSection');
        const demoGrid = document.getElementById('demoGrid');
        
        // Kiểm tra xem có ảnh demo không (và mảng không rỗng)
        if (doc.demo_urls && Array.isArray(doc.demo_urls) && doc.demo_urls.length > 0) {
            if (demoSection) demoSection.style.display = 'block'; // Hiện khu vực demo
            if (demoGrid) {
                demoGrid.innerHTML = ''; // Xóa cũ
                doc.demo_urls.forEach(url => {
                    const div = document.createElement('div');
                    div.className = 'demo-item';
                    div.innerHTML = `<img src="${url}" alt="Demo page">`;
                    
                    // Sự kiện click để phóng to
                    div.addEventListener('click', () => {
                        openLightbox(url);
                    });
                    
                    demoGrid.appendChild(div);
                });
            }
        } else {
            if (demoSection) demoSection.style.display = 'none'; // Ẩn nếu không có
        }

        // --- NHẬN DIỆN LOẠI FILE ---
        const fileExt = doc.file_url.split('.').pop().toLowerCase();
        let fileTypeIcon = '<i class="fas fa-file-alt" style="color: gray;"></i>';
        let fileTypeName = 'Tài liệu';

        if (fileExt === 'pdf') {
            fileTypeIcon = '<i class="fas fa-file-pdf" style="color: #ef4444;"></i>';
            fileTypeName = 'Định dạng PDF';
        } else if (['doc', 'docx'].includes(fileExt)) {
            fileTypeIcon = '<i class="fas fa-file-word" style="color: #2563eb;"></i>';
            fileTypeName = 'Định dạng Word';
        } else if (['ppt', 'pptx'].includes(fileExt)) {
            fileTypeIcon = '<i class="fas fa-file-powerpoint" style="color: #ea580c;"></i>';
            fileTypeName = 'Định dạng PowerPoint';
        } else if (['zip', 'rar', '7z'].includes(fileExt)) {
            fileTypeIcon = '<i class="fas fa-file-archive" style="color: #d97706;"></i>';
            fileTypeName = 'File nén (Zip/Rar)';
        }

        const infoBox = document.querySelector('.action-box p');
        if (infoBox) {
            infoBox.innerHTML = `
                <i class="fas fa-check-circle" style="color: green;"></i> Kiểm duyệt bởi <strong>Harriss</strong><br>
                ${fileTypeIcon} ${fileTypeName} chất lượng cao
            `;
        }

        // Kiểm tra trạng thái yêu thích
        checkFavoriteStatus();
    }

    // ================================================================
    // 3. XỬ LÝ LIGHTBOX (PHÓNG TO ẢNH)
    // ================================================================
    function openLightbox(src) {
        if (lightboxModal && lightboxImg) {
            lightboxModal.style.display = "block";
            lightboxImg.src = src;
        }
    }

    if (closeLightbox) {
        closeLightbox.addEventListener('click', () => {
            lightboxModal.style.display = "none";
        });
    }
    
    if (lightboxModal) {
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) lightboxModal.style.display = "none";
        });
    }

    // ================================================================
    // 4. XỬ LÝ DOWNLOAD
    // ================================================================
    if (btnDownload) {
        btnDownload.addEventListener('click', async () => {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (!user) {
                alert("Bạn cần đăng nhập để tải tài liệu này!");
                window.location.href = "login.html";
                return;
            }

            if (currentDocData.price > 0) {
                showPaymentModal();
            } else {
                try {
                    await window.supabaseClient.rpc('increment_downloads', { doc_id: docId });
                } catch (e) {}
                
                // Fix lỗi tải trên Mobile
                const link = document.createElement('a');
                link.href = currentDocData.file_url;
                link.target = '_blank';
                link.download = currentDocData.title;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        });
    }

    // ================================================================
    // 5. XỬ LÝ MODAL THANH TOÁN
    // ================================================================
    function showPaymentModal() {
        if (!currentDocData) return;
        document.getElementById('payDocName').textContent = currentDocData.title;
        document.getElementById('payDocId').textContent = currentDocData.id;
        document.getElementById('payDocPrice').textContent = new Intl.NumberFormat('vi-VN').format(currentDocData.price) + 'đ';
        if (paymentModal) paymentModal.classList.add('active');
    }

    if (closePaymentBtn) {
        closePaymentBtn.addEventListener('click', () => paymentModal.classList.remove('active'));
    }
    if (paymentModal) {
        paymentModal.addEventListener('click', (e) => {
            if (e.target === paymentModal) paymentModal.classList.remove('active');
        });
    }

    // ================================================================
    // 6. XỬ LÝ YÊU THÍCH
    // ================================================================
    async function checkFavoriteStatus() {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user || !btnFavorite) return;

        const { data: existing } = await window.supabaseClient
            .from('favorites')
            .select('id')
            .eq('user_id', user.id)
            .eq('document_id', docId)
            .maybeSingle();

        if (existing) {
            btnFavorite.innerHTML = '<i class="fas fa-heart" style="color: #ef4444;"></i> Đã yêu thích';
            btnFavorite.classList.add('active');
        } else {
            btnFavorite.innerHTML = '<i class="far fa-heart"></i> Lưu yêu thích';
            btnFavorite.classList.remove('active');
        }
    }

    if (btnFavorite) {
        btnFavorite.addEventListener('click', async () => {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (!user) {
                alert("Vui lòng đăng nhập để lưu tài liệu!");
                window.location.href = "login.html";
                return;
            }

            if (btnFavorite.innerHTML.includes('Đã yêu thích')) {
                if(confirm("Bỏ tài liệu này khỏi danh sách yêu thích?")) {
                    const { error } = await window.supabaseClient
                        .from('favorites')
                        .delete()
                        .eq('user_id', user.id)
                        .eq('document_id', docId);
                    
                    if (!error) {
                        btnFavorite.innerHTML = '<i class="far fa-heart"></i> Lưu yêu thích';
                        btnFavorite.classList.remove('active');
                    }
                }
                return;
            }

            const originalText = btnFavorite.innerHTML;
            btnFavorite.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

            const { error } = await window.supabaseClient
                .from('favorites')
                .insert({ user_id: user.id, document_id: docId });

            if (error) {
                alert("Lỗi: " + error.message);
                btnFavorite.innerHTML = originalText;
            } else {
                alert("Đã thêm vào danh sách yêu thích!");
                btnFavorite.innerHTML = '<i class="fas fa-heart" style="color: #ef4444;"></i> Đã yêu thích';
                btnFavorite.classList.add('active');
            }
        });
    }

    // KHỞI CHẠY
    loadDetail();
});
// assets/js/detail.js
// PHIÊN BẢN HOÀN CHỈNH: DOWNLOAD, PAYMENT MODAL, FAVORITES, FILE TYPES

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. LẤY ID TỪ URL
    const params = new URLSearchParams(window.location.search);
    const docId = params.get('id');

    // Biến toàn cục lưu dữ liệu tài liệu để dùng chung
    let currentDocData = null; 

    // Các Element giao diện
    const btnDownload = document.getElementById('btnDownload');
    const btnFavorite = document.querySelector('.btn-outline'); // Nút tim
    const paymentModal = document.getElementById('paymentModal');
    const closePaymentBtn = document.getElementById('closePaymentBtn');

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

        // --- ĐIỀN DỮ LIỆU VÀO HTML ---
        document.title = `${doc.title} - DocShare`;
        document.getElementById('docTitle').textContent = doc.title;
        document.getElementById('docCategory').textContent = doc.category || 'Tài liệu';
        document.getElementById('docDate').textContent = new Date(doc.created_at).toLocaleDateString('vi-VN');
        document.getElementById('docDownloads').textContent = doc.downloads || 0;
        document.getElementById('docDesc').textContent = doc.description || "Chưa có mô tả cho tài liệu này.";
        
        // Xử lý ảnh bìa (Nếu lỗi link thì dùng ảnh mặc định)
        const thumbImg = document.getElementById('docThumb');
        thumbImg.src = doc.thumbnail_url || 'https://placehold.co/300x200?text=No+Image';
        thumbImg.onerror = () => { thumbImg.src = 'https://placehold.co/300x200?text=Error'; };

        // Xử lý Giá tiền
        const priceEl = document.getElementById('docPrice');
        if (doc.price === 0) {
            priceEl.textContent = "Miễn phí";
            priceEl.style.color = "var(--secondary-color)";
        } else {
            priceEl.textContent = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(doc.price);
        }

        // --- TỰ ĐỘNG NHẬN DIỆN LOẠI FILE ---
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

        // Cập nhật thông tin bản quyền Harriss & Loại file
        const infoBox = document.querySelector('.action-box p');
        if (infoBox) {
            infoBox.innerHTML = `
                <i class="fas fa-check-circle" style="color: green;"></i> Kiểm duyệt bởi <strong>Harriss</strong><br>
                ${fileTypeIcon} ${fileTypeName} chất lượng cao
            `;
        }

        // Kiểm tra xem user đã like bài này chưa
        checkFavoriteStatus();
    }

    // ================================================================
    // 3. XỬ LÝ SỰ KIỆN DOWNLOAD (MIỄN PHÍ & CÓ PHÍ)
    // ================================================================
    if (btnDownload) {
        btnDownload.addEventListener('click', async () => {
            // A. Kiểm tra đăng nhập
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (!user) {
                alert("Bạn cần đăng nhập để tải tài liệu này!");
                window.location.href = "login.html";
                return;
            }

// ... (Phần kiểm tra đăng nhập và giá tiền giữ nguyên) ...

            // B. Kiểm tra giá tiền
            if (currentDocData.price > 0) {
                // -> CÓ PHÍ: Hiện Modal hướng dẫn mua
                showPaymentModal();
            } else {
                // -> MIỄN PHÍ: TẢI LUÔN (CODE MỚI CHO MOBILE)
                try {
                    // Tăng lượt tải (nếu có RPC)
                    window.supabaseClient.rpc('increment_downloads', { doc_id: docId });
                } catch (e) {}

                // --- FIX LỖI MOBILE: Dùng thẻ <a> thay vì window.open ---
                const link = document.createElement('a');
                link.href = currentDocData.file_url;
                link.target = '_blank'; // Mở tab mới
                link.download = currentDocData.title; // Gợi ý tên file khi tải
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
                });
    }

    // ================================================================
    // 4. XỬ LÝ MODAL THANH TOÁN (MÀU VÀNG)
    // ================================================================
    function showPaymentModal() {
        if (!currentDocData) return;

        // Điền thông tin vào Modal
        document.getElementById('payDocName').textContent = currentDocData.title;
        document.getElementById('payDocId').textContent = currentDocData.id;
        document.getElementById('payDocPrice').textContent = new Intl.NumberFormat('vi-VN').format(currentDocData.price) + 'đ';
        
        // Hiện Modal
        if (paymentModal) paymentModal.classList.add('active');
    }

    // Đóng Modal
    if (closePaymentBtn) {
        closePaymentBtn.addEventListener('click', () => {
            paymentModal.classList.remove('active');
        });
    }

    // Bấm ra ngoài vùng tối cũng đóng
    if (paymentModal) {
        paymentModal.addEventListener('click', (e) => {
            if (e.target === paymentModal) {
                paymentModal.classList.remove('active');
            }
        });
    }

    // ================================================================
    // 5. XỬ LÝ YÊU THÍCH (FAVORITES)
    // ================================================================
    
    // Hàm kiểm tra trạng thái ban đầu
    async function checkFavoriteStatus() {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user || !btnFavorite) return;

        // Dùng maybeSingle() để tránh lỗi 406 nếu chưa like
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

    // Sự kiện bấm nút tim
    if (btnFavorite) {
        btnFavorite.addEventListener('click', async () => {
            // Kiểm tra đăng nhập
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (!user) {
                alert("Vui lòng đăng nhập để lưu tài liệu!");
                window.location.href = "login.html";
                return;
            }

            // Nếu đang ở trạng thái "Đã yêu thích" -> Xóa
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
                    } else {
                        alert("Lỗi khi xóa: " + error.message);
                    }
                }
                return;
            }

            // Nếu chưa yêu thích -> Thêm mới
            const originalText = btnFavorite.innerHTML;
            btnFavorite.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

            const { error } = await window.supabaseClient
                .from('favorites')
                .insert({ user_id: user.id, document_id: docId });

            if (error) {
                console.error("Lỗi:", error);
                alert("Không thể lưu: " + error.message);
                btnFavorite.innerHTML = originalText;
            } else {
                alert("Đã thêm vào danh sách yêu thích!");
                btnFavorite.innerHTML = '<i class="fas fa-heart" style="color: #ef4444;"></i> Đã yêu thích';
                btnFavorite.classList.add('active');
            }
        });
    }

    // ================================================================
    // 6. KHỞI CHẠY
    // ================================================================
    loadDetail();
});
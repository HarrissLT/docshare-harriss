// assets/js/library.js

document.addEventListener('DOMContentLoaded', () => {
    const libraryList = document.getElementById('libraryList');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const resultTitle = document.getElementById('resultTitle');

    // 1. Hàm định dạng tiền
    const formatPrice = (price) => {
        if (price === 0) return '<span class="tag free">Miễn phí</span>';
        return `<span class="tag premium">${new Intl.NumberFormat('vi-VN').format(price)}đ</span>`;
    };

    // 2. Hàm tải tài liệu
    async function loadDocuments(keyword = "") {
        console.log("Đang tải tài liệu... Từ khóa:", keyword); // Debug

        // Hiển thị loading
        if (libraryList) {
            libraryList.innerHTML = '<p style="text-align: center; grid-column: 1/-1;"><i class="fas fa-spinner fa-spin"></i> Đang xử lý...</p>';
        }

        // Tạo Query Supabase
        let query = window.supabaseClient
            .from('documents')
            .select('*')
            .order('created_at', { ascending: false });

        // Nếu có từ khóa -> Lọc theo tên (title)
        if (keyword.trim() !== "") {
            query = query.ilike('title', `%${keyword}%`);
        }

        // Gọi dữ liệu
        const { data: documents, error } = await query;

        // Xử lý lỗi
        if (error) {
            console.error("Lỗi Supabase:", error);
            libraryList.innerHTML = `<p style="color: red; text-align: center;">Lỗi tải dữ liệu: ${error.message}</p>`;
            return;
        }

        // Xử lý không có dữ liệu
        if (!documents || documents.length === 0) {
            libraryList.innerHTML = `
                <div style="text-align:center; grid-column: 1/-1; padding: 50px;">
                    <i class="fas fa-search" style="font-size: 3rem; color: #ddd; margin-bottom: 20px;"></i>
                    <p style="color: #666;">Không tìm thấy tài liệu nào phù hợp.</p>
                </div>`;
            return;
        }

        console.log(`Tìm thấy ${documents.length} tài liệu.`); // Debug

        // Render ra HTML
        libraryList.innerHTML = '';
        documents.forEach(doc => {
            const thumb = doc.thumbnail_url || 'https://placehold.co/300x200?text=No+Image';
            
            const card = document.createElement('div');
            card.className = 'doc-card';
            card.innerHTML = `
                <div class="card-thumb">
                    ${formatPrice(doc.price)}
                    <img src="${thumb}" alt="${doc.title}" onerror="this.src='https://placehold.co/300x200?text=Error'">
                    <div class="overlay">
                        <a href="detail.html?id=${doc.id}" class="btn-icon" style="display:flex;align-items:center;justify-content:center;text-decoration:none">
                            <i class="fas fa-eye"></i>
                        </a>
                    </div>
                </div>
                <div class="card-body">
                    <div class="cat-date">
                        <span class="category">${doc.category || 'Tài liệu'}</span>
                        <span class="date">${new Date(doc.created_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <h3 class="doc-title">
                        <a href="detail.html?id=${doc.id}" style="color:inherit">${doc.title}</a>
                    </h3>
                    <div class="card-footer">
                        <div class="price">${doc.price === 0 ? 'Free' : new Intl.NumberFormat('vi-VN').format(doc.price) + 'đ'}</div>
                        <div class="downloads"><i class="fas fa-download"></i> ${doc.downloads || 0}</div>
                    </div>
                </div>
            `;
            libraryList.appendChild(card);
        });
    }

    // 3. Sự kiện Tìm kiếm
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const keyword = searchInput.value;
            if (resultTitle) {
                resultTitle.textContent = keyword ? `Kết quả tìm kiếm: "${keyword}"` : "Tất cả tài liệu";
            }
            loadDocuments(keyword);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchBtn.click();
        });
    }

    // Chạy lần đầu
    loadDocuments();
});
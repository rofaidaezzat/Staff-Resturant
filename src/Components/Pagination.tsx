import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}) => {
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const generatePageNumbers = () => {
    const pages = [];
    const showPages = 5; // عدد الصفحات التي تظهر

    let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
    let endPage = Math.min(totalPages, startPage + showPages - 1);

    // تعديل startPage إذا كانت endPage في النهاية
    if (endPage - startPage + 1 < showPages) {
      startPage = Math.max(1, endPage - showPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const pageNumbers = generatePageNumbers();

  if (totalPages <= 1) {
    return null; // لا نعرض pagination إذا كان هناك صفحة واحدة فقط
  }

  return (
    <div className={`flex items-center justify-center py-8 px-4 ${className}`}>
      <div className="flex flex-col items-center space-y-4">
        {/* معلومات الصفحة الحالية */}
        <div className="text-orange-600 font-medium text-sm">
          Page {currentPage} of {totalPages}
        </div>

        {/* أزرار التنقل */}
        <div className="flex items-center space-x-2">
          {/* زر الصفحة السابقة */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`
              flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200
              ${
                currentPage === 1
                  ? "bg-orange-100 text-orange-300 cursor-not-allowed"
                  : "bg-white text-orange-500 hover:bg-orange-500 hover:text-white shadow-md hover:shadow-lg border border-orange-200"
              }
            `}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* رقم الصفحة الأولى */}
          {pageNumbers[0] > 1 && (
            <>
              <button
                onClick={() => handlePageChange(1)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white text-orange-500 hover:bg-orange-500 hover:text-white transition-all duration-200 shadow-md hover:shadow-lg border border-orange-200 font-medium"
              >
                1
              </button>
              {pageNumbers[0] > 2 && (
                <span className="text-orange-400 px-2 font-medium">...</span>
              )}
            </>
          )}

          {/* أرقام الصفحات */}
          {pageNumbers.map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`
                flex items-center justify-center w-10 h-10 rounded-full font-medium transition-all duration-200
                ${
                  page === currentPage
                    ? "bg-gradient-to-r from-orange-400 to-orange-600 text-white shadow-lg transform scale-105"
                    : "bg-white text-orange-500 hover:bg-orange-500 hover:text-white shadow-md hover:shadow-lg border border-orange-200"
                }
              `}
            >
              {page}
            </button>
          ))}

          {/* رقم الصفحة الأخيرة */}
          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                <span className="text-orange-400 px-2 font-medium">...</span>
              )}
              <button
                onClick={() => handlePageChange(totalPages)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white text-orange-500 hover:bg-orange-500 hover:text-white transition-all duration-200 shadow-md hover:shadow-lg border border-orange-200 font-medium"
              >
                {totalPages}
              </button>
            </>
          )}

          {/* زر الصفحة التالية */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`
              flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200
              ${
                currentPage === totalPages
                  ? "bg-orange-100 text-orange-300 cursor-not-allowed"
                  : "bg-white text-orange-500 hover:bg-orange-500 hover:text-white shadow-md hover:shadow-lg border border-orange-200"
              }
            `}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* أزرار الانتقال السريع */}
        <div className="flex space-x-3">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${
                currentPage === 1
                  ? "bg-orange-100 text-orange-300 cursor-not-allowed"
                  : "bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white border border-orange-200"
              }
            `}
          >
            First
          </button>

          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${
                currentPage === totalPages
                  ? "bg-orange-100 text-orange-300 cursor-not-allowed"
                  : "bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white border border-orange-200"
              }
            `}
          >
            Last
          </button>
        </div>

        {/* شريط التقدم */}
        <div className="w-48 bg-orange-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(currentPage / totalPages) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default Pagination;

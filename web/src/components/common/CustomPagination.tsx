import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface CustomPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblings?: number; // Number of pages to show on each side of current page
  boundaries?: number; // Number of pages to show at the start and end
  hideWithOnePage?: boolean;
  disabled?: boolean;
}

function CustomPagination({
  currentPage,
  totalPages,
  onPageChange,
  siblings = 1,
  boundaries = 1,
  hideWithOnePage = false,
  disabled = false,
}: CustomPaginationProps) {
  // Hide pagination if only one page and hideWithOnePage is true
  if (hideWithOnePage && totalPages <= 1) {
    return null;
  }

  // Calculate which page numbers to display
  const generatePageNumbers = (): (number | 'ellipsis-start' | 'ellipsis-end')[] => {
    const totalNumbers = siblings * 2 + 3 + boundaries * 2;
    
    if (totalPages <= totalNumbers) {
      // Show all pages if total is small enough
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblings, boundaries + 1);
    const rightSiblingIndex = Math.min(currentPage + siblings, totalPages - boundaries);

    const showLeftEllipsis = leftSiblingIndex > boundaries + 2;
    const showRightEllipsis = rightSiblingIndex < totalPages - boundaries - 1;

    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];

    // Add boundary pages at the start
    for (let i = 1; i <= boundaries; i++) {
      pages.push(i);
    }

    // Add left ellipsis
    if (showLeftEllipsis) {
      pages.push('ellipsis-start');
    } else if (boundaries + 1 < leftSiblingIndex) {
      for (let i = boundaries + 1; i < leftSiblingIndex; i++) {
        pages.push(i);
      }
    }

    // Add sibling pages
    for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
      pages.push(i);
    }

    // Add right ellipsis
    if (showRightEllipsis) {
      pages.push('ellipsis-end');
    } else if (rightSiblingIndex < totalPages - boundaries) {
      for (let i = rightSiblingIndex + 1; i < totalPages - boundaries + 1; i++) {
        pages.push(i);
      }
    }

    // Add boundary pages at the end
    for (let i = totalPages - boundaries + 1; i <= totalPages; i++) {
      if (i > 0) {
        pages.push(i);
      }
    }

    return pages;
  };

  const pageNumbers = generatePageNumbers();

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={handlePrevious}
            className={(currentPage === 1 || disabled) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>

        {pageNumbers.map((pageNum, index) => {
          if (pageNum === 'ellipsis-start' || pageNum === 'ellipsis-end') {
            return (
              <PaginationItem key={`ellipsis-${pageNum}-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            );
          }

          return (
            <PaginationItem key={pageNum}>
              <PaginationLink
                onClick={() => handlePageClick(pageNum)}
                isActive={currentPage === pageNum}
                className={(disabled) ? 'cursor-not-allowed pointer-events-none opacity-50' : 'cursor-pointer'}
              >
                {pageNum}
              </PaginationLink>
            </PaginationItem>
          );
        })}

        <PaginationItem>
          <PaginationNext
            onClick={handleNext}
            className={(currentPage === totalPages || disabled) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export default CustomPagination
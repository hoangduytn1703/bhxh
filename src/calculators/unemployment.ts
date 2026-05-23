import { RULES } from '../config/socialInsuranceRules';

export type UnemploymentResult = {
  eligibleMonths: number;
  monthlyAmount: number;
  totalAmount: number;
  deadlineDate: Date;
  isEligible: boolean;
  message: string;
};

export function calculateUnemployment(
  totalMonthsContributed: number,
  averageSalary6Months: number,
  quitDate: Date,
  hasApplied: boolean
): UnemploymentResult {
  // Luôn tính toán số tháng hưởng mặc định nếu đóng dưới 12 tháng để người dùng có số liệu tham khảo
  const effectiveMonths = totalMonthsContributed < 12 ? 12 : totalMonthsContributed;
  let eligibleMonths = 3;
  if (effectiveMonths > 36) {
    eligibleMonths = Math.min(12, 3 + Math.floor((effectiveMonths - 36) / 12));
  }
  
  const monthlyAmount = averageSalary6Months * RULES.UNEMPLOYMENT_RATE;
  const totalAmount = eligibleMonths * monthlyAmount;
  const deadlineDate = new Date(quitDate);
  deadlineDate.setMonth(deadlineDate.getMonth() + 3);
  const today = new Date();
  let isEligible = true;
  let message = 'Bạn đủ điều kiện hưởng trợ cấp thất nghiệp.';
  
  if (totalMonthsContributed < 12) {
    isEligible = false;
    message = 'Thời gian đóng BHTN dưới 12 tháng (chưa đủ điều kiện nhận thực tế). Hệ thống vẫn hiển thị ước tính mức trợ cấp tối thiểu 3 tháng làm tham khảo cho bạn.';
  } else if (today > deadlineDate) {
    isEligible = false;
    message = 'Quá hạn nộp hồ sơ hưởng BHTN (3 tháng kể từ ngày nghỉ việc). Tuy nhiên, số tiền tích lũy lý thuyết vẫn được hệ thống giữ lại ước tính cho bạn.';
  } else if (hasApplied) {
    message = 'Bạn đã nộp hồ sơ thành công, vui lòng đợi phê duyệt từ cơ quan BHXH.';
  }
  
  return { 
    eligibleMonths, 
    monthlyAmount: Math.round(monthlyAmount), 
    totalAmount: Math.round(totalAmount), 
    deadlineDate, 
    isEligible, 
    message 
  };
}

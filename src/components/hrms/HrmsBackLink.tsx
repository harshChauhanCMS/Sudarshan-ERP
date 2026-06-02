import Link from "next/link";
import { ArrowLeftOutlined } from "@ant-design/icons";

export default function HrmsBackLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link href={href} className="rep-breadcrumb">
      <ArrowLeftOutlined className="rep-breadcrumb__icon" />
      {label}
    </Link>
  );
}

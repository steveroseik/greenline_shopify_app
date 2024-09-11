import { OrderDTO } from "./order.dto";
import { PageInfo } from "./orderPageInterface";

export interface GeneratedOrdersPageProps {
  orders: OrderDTO[];
  pageInfo: PageInfo;
}

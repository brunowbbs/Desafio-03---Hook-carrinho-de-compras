import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const copyCart = [...cart];

      //Verificar se o produto ja existe no carrinho
      const productExistInCart = copyCart.find(
        (product) => product.id === productId
      );
      const amountProductExists = productExistInCart?.amount || 0;

      //Verificar quantidade no estoque
      const productInStock = await api.get(`/stock/${productId}`);
      const productStockAmount = productInStock.data.amount;

      //Verificando se existe estoque disponivel antes de add no carrinho
      if (amountProductExists >= productStockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productExistInCart) {
        //Ao fazer essa alteraço no item do array, o array original (copyArray) tbm será afetado
        productExistInCart.amount = amountProductExists + 1;
      } else {
        //obtendo dados do produto a ser adicionado no carrinho
        const productResponse = await api.get(`/products/${productId}`);
        const newProduct = { ...productResponse.data, amount: 1 };

        //inserindo novo item na copia do array
        copyCart.push(newProduct);
      }

      //Alterando o estado do carrinho
      setCart(copyCart);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(copyCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      //encontrando item no carrinho para remoção
      const copyCart = [...cart];
      const indexProduct = copyCart.findIndex(
        (product) => product.id === productId
      );

      //Caso encontre o index, remova o produto
      if (indexProduct !== -1) {
        copyCart.splice(indexProduct, 1);
      } else {
        throw new Error();
      }

      setCart(copyCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(copyCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const copyCart = [...cart];
      const productExists = copyCart.find(
        (product) => product.id === productId
      );

      if (productExists) {
        //A alteração nesse item do array, refletirá tbm no array original (copyCard)
        productExists.amount = amount;
        setCart(copyCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(copyCart));
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

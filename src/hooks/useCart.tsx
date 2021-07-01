import { useEffect } from "react";
import { createContext, ReactNode, useContext, useState } from "react";
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

  useEffect(() => {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  }, [cart]);

  const addProduct = async (productId: number) => {
    const productStock = await (await api.get(`/stock/${productId}`)).data;
    const productAlreadyOnCart = cart.find((item) => item.id === productId);
    const products = await (await api.get(`/products`)).data;
    const foundProduct = await products.find(
      (item: Product) => item.id === productId
    );

    try {
      if (!foundProduct) {
        return;
      }
      if (productAlreadyOnCart) {
        if (productStock.amount >= productAlreadyOnCart.amount + 1) {
          const newCart = cart.map((item) => {
            if (item.id === productId)
              return { ...item, amount: item.amount + 1 };
            else return item;
          });
          setCart(newCart);
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      } else setCart([...cart, { ...foundProduct, amount: 1 }]);
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = cart.filter((product) => product.id !== productId);
      setCart(updatedCart);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    const productStock = await (await api.get(`/stock/${productId}`)).data;
    const products = await (await api.get(`/products`)).data;
    const productExists = await products.find(
      (item: Product) => item.id === productId
    );
    try {
      if (amount < 1) {
        return;
      }

      if (!productExists) {
        return;
      }

      if (productStock.amount >= amount) {
        const updatedCart = cart.map((item) => {
          if (item.id === productId) return { ...item, amount };
          else return item;
        });

        setCart(updatedCart);
      } else {
        toast.error("Quantidade solicitada fora de estoque");
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

import Button from "../Button";
import { NavBar } from "../NavBar";

export default function Header() {
  return (
    <NavBar.Root>
      <NavBar.Logo imgSrc="/logo.svg" />
      <NavBar.ItemList>
        <NavBar.Item>Home</NavBar.Item>
        <NavBar.Item>About Us</NavBar.Item>
        <NavBar.Item>Services</NavBar.Item>
        <NavBar.Item>Contact</NavBar.Item>
      </NavBar.ItemList>
      <NavBar.ButtonWrap>
        <Button className="px-5 py-2" variant="outline">
          Contact Us
        </Button>
        <Button className="px-5 py-2" variant="primary">
          Get Quote
        </Button>
      </NavBar.ButtonWrap>
    </NavBar.Root>
  );
}

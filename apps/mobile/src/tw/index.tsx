import { Link as RouterLink } from "expo-router";
import React from "react";
import {
  View as RNView,
  Text as RNText,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  TouchableHighlight as RNTouchableHighlight,
  TextInput as RNTextInput,
  StyleSheet,
} from "react-native";
import { cssInterop } from "nativewind";

cssInterop(RNView, { className: "style" });
cssInterop(RNText, { className: "style" });
cssInterop(RNScrollView, { className: "style", contentContainerClassName: "contentContainerStyle" });
cssInterop(RNPressable, { className: "style" });
cssInterop(RNTextInput, { className: "style" });
cssInterop(RouterLink as any, { className: "style" });

export const Link = RouterLink as any;
export const useCSSVariable = (variable: string) => undefined;
export const View = RNView as any;
export const Text = RNText as any;
export const ScrollView = RNScrollView as any;
export const Pressable = RNPressable as any;
export const TextInput = RNTextInput as any;
export const TouchableHighlight = RNTouchableHighlight as any;

# Ready POS Translations

This folder contains translation files for Ready POS.

## Available Translations

Currently, Ready POS includes:
- English (default)

## Generate .pot File

To generate the translation template file:

```bash
npm run i18n
```

This creates `languages/ready-pos.pot` which can be used by translators.

## Contributing Translations

We welcome translations! There are two ways to contribute:

### 1. Via WordPress.org (Recommended)

1. Go to https://translate.wordpress.org/projects/wp-plugins/ready-pos
2. Select your language
3. Start translating strings
4. Approved translations are automatically included in plugin updates

### 2. Manual Translation

1. Download `ready-pos.pot` from this folder
2. Use Poedit (https://poedit.net/) or similar tool
3. Create `.po` and `.mo` files for your language
4. Name them: `ready-pos-{locale}.po` and `ready-pos-{locale}.mo`
   - Example: `ready-pos-fr_FR.po` for French (France)
   - Example: `ready-pos-es_ES.mo` for Spanish (Spain)
5. Place files in this `languages/` folder
6. Submit via GitHub pull request

## Locale Codes

Common locale codes:
- `en_US` - English (United States)
- `fr_FR` - French (France)
- `es_ES` - Spanish (Spain)
- `de_DE` - German (Germany)
- `it_IT` - Italian (Italy)
- `pt_BR` - Portuguese (Brazil)
- `nl_NL` - Dutch (Netherlands)
- `ru_RU` - Russian (Russia)
- `ja` - Japanese
- `zh_CN` - Chinese (Simplified)
- `ar` - Arabic

[Full list of locale codes](https://make.wordpress.org/polyglots/teams/)

## Translation Guidelines

1. **Context Matters**: Some strings have translator comments explaining context
2. **Keep Placeholders**: Don't translate `%s`, `%d`, `{variable}` etc.
3. **Maintain Formatting**: Keep HTML tags and spacing
4. **Test Translations**: Install your translation and test in the plugin
5. **Be Consistent**: Use the same terms throughout
6. **Follow WordPress Style**: Match WordPress core translations style

## RTL Languages

Ready POS supports Right-to-Left (RTL) languages like Arabic and Hebrew.

RTL stylesheet is automatically loaded for RTL languages.

## Need Help?

- **Translation Questions**: plugins@wordpress.org
- **Technical Issues**: https://wordpress.org/support/plugin/ready-pos/

## Credits

Thank you to all translators who make Ready POS accessible worldwide! 🌍

Translation contributors are credited on WordPress.org and in plugin documentation.

## License

All translations are released under GPLv2 or later, same as the plugin.

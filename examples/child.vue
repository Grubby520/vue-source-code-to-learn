<template>
  <ul>
    <li v-for="item of list" :key="item.value">{{ item.key }}</li>
  </ul>
</template>

<script>
export default {
  name: "child",
  computed: {
    cname() {
      return this.testName.toUpperCase();
    },
  },
  data() {
    return {
      list: [
        {
          key: "li",
          value: "li",
        },
        {
          key: "lan",
          value: "lan",
        },
      ],
    };
  },
};
</script>
